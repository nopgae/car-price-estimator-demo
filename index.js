const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const port = process.env.PORT || 3000;

// Load car data from CSV
let carData = [];
function loadCarData() {
  const csvPath = path.join(__dirname, 'data', 'used_cars.csv');
  
  if (fs.existsSync(csvPath)) {
    carData = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => carData.push(data))
      .on('end', () => {
        console.log(`Loaded ${carData.length} cars from CSV`);
      })
      .on('error', (error) => {
        console.error('Error loading car data:', error);
      });
  } else {
    console.warn('CSV file not found at:', csvPath);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly define the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Parse JSON requests
app.use(express.json());

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Route to handle car image uploads
app.post('/api/upload', upload.single('carImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // In a real application, you would send the image to a computer vision API
    // For demo purposes, we'll simulate recognition with random data
    
    const brands = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW'];
    const models = {
      'Toyota': ['Camry', 'Corolla', 'RAV4'],
      'Honda': ['Civic', 'Accord', 'CR-V'],
      'Ford': ['F-150', 'Escape', 'Mustang'],
      'Chevrolet': ['Silverado', 'Equinox', 'Malibu'],
      'BMW': ['3 Series', '5 Series', 'X5']
    };
    
    // Randomly select a brand and model
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const model = models[brand][Math.floor(Math.random() * models[brand].length)];
    const year = Math.floor(Math.random() * (2024 - 2015 + 1)) + 2015;
    
    // Get price estimate based on real data (when available)
    const priceEstimate = getCarPriceEstimate(brand, model, year);
    
    res.json({
      success: true,
      imagePath: `/uploads/${req.file.filename}`,
      car: {
        brand,
        model,
        year,
        condition: ['Excellent', 'Good', 'Very Good', 'Fair'][Math.floor(Math.random() * 4)]
      },
      priceEstimate: {
        min: priceEstimate.min,
        max: priceEstimate.max,
        avg: priceEstimate.avg
      },
      similarCars: generateSimilarCars(brand, model, year)
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Error processing upload' });
  }
});

// Route to get car data from the CSV
app.get('/api/cars', (req, res) => {
  const results = [];
  
  // Path to CSV file
  const csvPath = path.join(__dirname, 'data', 'used_cars.csv');
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'Car data not found' });
  }
  
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.json(results);
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      res.status(500).json({ error: 'Error reading car data' });
    });
});

// Function to get price estimate based on real data
function getCarPriceEstimate(brand, model, year) {
  // Filter cars with similar brand, model, and year range
  const similarCars = carData.filter(car => {
    return (
      car.brand.toLowerCase() === brand.toLowerCase() ||
      car.model.toLowerCase().includes(model.toLowerCase()) ||
      (car.model_year >= year - 2 && car.model_year <= year + 2)
    );
  });
  
  if (similarCars.length > 0) {
    // Extract prices, remove $ and commas
    const prices = similarCars.map(car => {
      if (car.price) {
        return parseInt(car.price.replace(/[$,]/g, ''));
      }
      return 0;
    }).filter(price => price > 0);
    
    if (prices.length > 0) {
      // Calculate min, max, and average
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      return {
        min: Math.round(minPrice * 0.9), // 10% lower than minimum
        max: Math.round(maxPrice * 1.1), // 10% higher than maximum
        avg: Math.round(avgPrice)
      };
    }
  }
  
  // Fallback to random pricing if no data
  const basePrice = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
  return {
    min: basePrice - 3000,
    max: basePrice + 5000,
    avg: basePrice
  };
}

// Function to generate similar cars for demo
function generateSimilarCars(brand, model, year) {
  // Try to find similar cars in our dataset
  const realSimilarCars = carData
    .filter(car => 
      (car.brand.toLowerCase() === brand.toLowerCase() ||
       car.model.toLowerCase().includes(model.toLowerCase())) &&
      (car.model_year >= year - 3 && car.model_year <= year + 3)
    )
    .slice(0, 5);
  
  // If we have at least 3 real similar cars, use those
  if (realSimilarCars.length >= 3) {
    return realSimilarCars.map((car, index) => ({
      id: index + 1,
      brand: car.brand,
      model: car.model,
      year: car.model_year || year,
      price: car.price ? parseInt(car.price.replace(/[$,]/g, '')) : Math.floor(Math.random() * (40000 - 15000 + 1)) + 15000,
      mileage: car.milage ? parseInt(car.milage.replace(/[, mi.]/g, '')) : Math.floor(Math.random() * (80000 - 10000 + 1)) + 10000,
      transmission: car.transmission || ['Automatic', 'Manual'][Math.floor(Math.random() * 2)],
      fuelType: car.fuel_type || ['Gasoline', 'Hybrid', 'Diesel'][Math.floor(Math.random() * 3)],
      color: car.ext_col || ['White', 'Black', 'Silver', 'Blue', 'Red'][Math.floor(Math.random() * 5)]
    }));
  }
  
  // Otherwise, generate random similar cars
  const similarCars = [];
  
  for (let i = 0; i < 5; i++) {
    const carYear = year + Math.floor(Math.random() * 5) - 2;
    const price = Math.floor(Math.random() * (40000 - 15000 + 1)) + 15000;
    const mileage = Math.floor(Math.random() * (80000 - 10000 + 1)) + 10000;
    
    similarCars.push({
      id: i + 1,
      brand,
      model,
      year: carYear,
      price,
      mileage,
      transmission: ['Automatic', 'Manual'][Math.floor(Math.random() * 2)],
      fuelType: ['Gasoline', 'Hybrid', 'Diesel'][Math.floor(Math.random() * 3)],
      color: ['White', 'Black', 'Silver', 'Blue', 'Red'][Math.floor(Math.random() * 5)]
    });
  }
  
  return similarCars;