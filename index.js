// index.js - Main server file
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Load car data
let carData = [];
function loadCarData() {
  try {
    const csvPath = path.join(__dirname, 'data', 'used_cars.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    const result = Papa.parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
    
    carData = result.data;
    console.log(`Loaded ${carData.length} car records from CSV file`);
  } catch (error) {
    console.error('Error loading car data:', error);
    // Load sample data as fallback
    carData = getSampleCarData();
    console.log('Loaded sample car data instead');
  }
}

// Simulate car identification (in a real app, this would use a vision API)
function identifyCar(imagePath) {
  // For demo purposes, we'll return predefined results based on random selection
  // This simulates what a vision API would return
  
  const carMakes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Chevrolet'];
  const carModels = {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey'],
    'Ford': ['F-150', 'Escape', 'Explorer', 'Mustang', 'Edge'],
    'BMW': ['3 Series', '5 Series', 'X3', 'X5', '7 Series'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class'],
    'Chevrolet': ['Silverado', 'Equinox', 'Tahoe', 'Malibu', 'Traverse']
  };
  
  // Select a random make
  const make = carMakes[Math.floor(Math.random() * carMakes.length)];
  
  // Select a random model for that make
  const models = carModels[make];
  const model = models[Math.floor(Math.random() * models.length)];
  
  // Generate a random recent year
  const year = Math.floor(Math.random() * 10) + 2014; // 2014-2023
  
  return {
    make: make,
    model: model,
    year: year,
    confidence: 0.85 + (Math.random() * 0.14) // Random confidence between 0.85 and 0.99
  };
}

// Estimate car price based on identification
function estimateCarPrice(carInfo) {
  // Filter cars by make and model
  let similarCars = carData.filter(car => {
    return car.brand && car.model && 
           car.brand.toLowerCase() === carInfo.make.toLowerCase() && 
           car.model.toLowerCase().includes(carInfo.model.toLowerCase());
  });
  
  // If no exact matches, try just by make
  if (similarCars.length < 3) {
    similarCars = carData.filter(car => 
      car.brand && car.brand.toLowerCase() === carInfo.make.toLowerCase()
    );
  }
  
  // Filter by year range if we have enough cars
  if (similarCars.length > 5 && carInfo.year) {
    const yearRange = 3;
    const filteredByYear = similarCars.filter(car => 
      car.model_year >= carInfo.year - yearRange && 
      car.model_year <= carInfo.year + yearRange
    );
    
    // Only use year filtering if we still have enough cars after filtering
    if (filteredByYear.length >= 3) {
      similarCars = filteredByYear;
    }
  }
  
  // Extract prices from similar cars
  const prices = similarCars.map(car => {
    if (typeof car.price === 'string') {
      // Clean price strings like "$25,000" to numeric values
      return parseFloat(car.price.replace(/[$,]/g, ''));
    }
    return car.price;
  }).filter(price => !isNaN(price) && price > 0);
  
  // Return pricing data if we have enough matches
  if (prices.length > 0) {
    // Sort prices for median calculation
    prices.sort((a, b) => a - b);
    
    // Calculate statistics
    const sum = prices.reduce((total, price) => total + price, 0);
    const average = sum / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    
    return {
      available: true,
      count: prices.length,
      average: Math.round(average),
      median: Math.round(median),
      min: Math.round(Math.min(...prices)),
      max: Math.round(Math.max(...prices))
    };
  } else {
    // If we don't have enough data, provide a fallback estimate
    const basePrice = getBasePriceEstimate(carInfo.make, carInfo.model, carInfo.year);
    
    return {
      available: true,
      count: 1, // Mock data point
      average: basePrice,
      median: basePrice,
      min: Math.round(basePrice * 0.9),
      max: Math.round(basePrice * 1.1)
    };
  }
}

// Get a baseline price estimate when we don't have enough data
function getBasePriceEstimate(make, model, year) {
  // Base prices for different makes (simplified for demo)
  const basePrices = {
    'Toyota': 25000,
    'Honda': 24000,
    'Ford': 30000,
    'BMW': 45000,
    'Mercedes-Benz': 50000,
    'Chevrolet': 35000
  };
  
  // Premium models adjustment
  const modelPremiums = {
    'Camry': 1.1,
    'RAV4': 1.2,
    'Prius': 1.15,
    'Corolla': 0.9,
    'Civic': 0.85,
    'Accord': 1.1,
    'CR-V': 1.2,
    'F-150': 1.3,
    'Mustang': 1.25,
    '5 Series': 1.2,
    'X5': 1.4,
    'E-Class': 1.3,
    'S-Class': 1.8,
    'Silverado': 1.3
  };
  
  // Get base price for make or use average if not found
  let basePrice = basePrices[make] || 30000;
  
  // Apply model premium if available
  const modelMultiplier = modelPremiums[model] || 1.0;
  basePrice *= modelMultiplier;
  
  // Apply year-based depreciation (roughly 10% per year from 2023)
  const currentYear = 2024;
  const yearDiff = currentYear - year;
  const depreciation = yearDiff > 0 ? Math.pow(0.9, yearDiff) : 1;
  
  return Math.round(basePrice * depreciation);
}

// Get sample car data for fallback
function getSampleCarData() {
  // Sample data with a focus on Toyota Camrys for the demo
  return [
    {
      brand: 'Toyota',
      model: 'Camry LE',
      model_year: 2018,
      milage: '45,000 mi.',
      price: '$22,500'
    },
    {
      brand: 'Toyota',
      model: 'Camry SE',
      model_year: 2019,
      milage: '35,000 mi.',
      price: '$24,800'
    },
    {
      brand: 'Toyota',
      model: 'Camry XLE',
      model_year: 2020,
      milage: '28,000 mi.',
      price: '$27,300'
    },
    {
      brand: 'Toyota',
      model: 'Camry Hybrid',
      model_year: 2021,
      milage: '15,000 mi.',
      price: '$31,200'
    },
    {
      brand: 'Honda',
      model: 'Accord LX',
      model_year: 2019,
      milage: '42,000 mi.',
      price: '$23,400'
    },
    {
      brand: 'Honda',
      model: 'Accord Sport',
      model_year: 2020,
      milage: '31,000 mi.',
      price: '$26,500'
    }
  ];
}

// Routes
app.post('/api/identify-car', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  
  try {
    // Get the path of the uploaded image
    const imagePath = req.file.path;
    
    // In a real app, this would call a vision API
    // For our demo, we'll simulate a car identification
    const carIdentification = identifyCar(imagePath);
    
    // Get price estimate
    const priceEstimate = estimateCarPrice(carIdentification);
    
    // Return the result
    res.json({
      success: true,
      carInfo: carIdentification,
      priceEstimate: priceEstimate
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Error processing image' });
  }
});

app.post('/api/estimate-price', (req, res) => {
  const { make, model, year } = req.body;
  
  if (!make || !model) {
    return res.status(400).json({ error: 'Make and model are required' });
  }
  
  try {
    const carInfo = {
      make: make,
      model: model,
      year: parseInt(year) || new Date().getFullYear() - 3 // Default to 3 years old if no year provided
    };
    
    const priceEstimate = estimateCarPrice(carInfo);
    
    res.json({
      success: true,
      carInfo: carInfo,
      priceEstimate: priceEstimate
    });
  } catch (error) {
    console.error('Error estimating price:', error);
    res.status(500).json({ error: 'Error estimating price' });
  }
});

// Create the data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create used_cars.csv with sample data if it doesn't exist
const csvPath = path.join(dataDir, 'used_cars.csv');
if (!fs.existsSync(csvPath)) {
  const sampleCars = getSampleCarData();
  const csv = Papa.unparse(sampleCars);
  fs.writeFileSync(csvPath, csv);
  console.log('Created sample used_cars.csv file');
}

// Load car data on startup
loadCarData();

// Start the server
app.listen(port, () => {
  console.log(`Car estimation demo app running on http://localhost:${port}`);
});