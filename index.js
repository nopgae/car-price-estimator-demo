const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

const app = express();
const port = process.env.PORT || 3000;

// Set up file upload storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve static files from the public directory
app.use(express.static('public'));
app.use(express.json());

// Path to the CSV data file
const dataFilePath = path.join(__dirname, 'data', 'used_cars.csv');

// Load and parse the CSV data once on startup
let carsData = [];
fs.createReadStream(dataFilePath)
  .pipe(csvParser())
  .on('data', (row) => {
    // Clean up price data by removing $ and commas
    if (row.price) {
      row.price = parseFloat(row.price.replace(/[$,]/g, ''));
    }
    // Convert model_year to number if it's a string
    if (row.model_year && typeof row.model_year === 'string') {
      row.model_year = parseInt(row.model_year, 10);
    }
    carsData.push(row);
  })
  .on('end', () => {
    console.log(`Loaded ${carsData.length} car records from CSV`);
  })
  .on('error', (error) => {
    console.error('Error reading CSV file:', error);
  });

// API endpoint to get all car brands
app.get('/api/brands', (req, res) => {
  const brands = [...new Set(carsData.map(car => car.brand))].sort();
  res.json(brands);
});

// API endpoint to get models for a specific brand
app.get('/api/models/:brand', (req, res) => {
  const brand = req.params.brand;
  const models = [...new Set(
    carsData
      .filter(car => car.brand === brand)
      .map(car => car.model)
  )].sort();
  res.json(models);
});

// API endpoint to estimate car price
app.post('/api/estimate', (req, res) => {
  const { brand, model, year, mileage, accident, cleanTitle } = req.body;
  
  if (!brand || !model || !year) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Filter similar cars
  const similarCars = carsData.filter(car => {
    return car.brand === brand && 
           car.model === model && 
           Math.abs(car.model_year - parseInt(year)) <= 2;
  });
  
  if (similarCars.length === 0) {
    return res.status(404).json({ 
      error: 'Not enough data to estimate price for this configuration' 
    });
  }
  
  // Calculate average price
  const totalPrice = similarCars.reduce((sum, car) => sum + car.price, 0);
  let estimatedPrice = totalPrice / similarCars.length;
  
  // Adjust for mileage if provided
  if (mileage) {
    const avgMileage = similarCars
      .map(car => parseInt(car.milage.replace(/[^0-9]/g, '')))
      .filter(m => !isNaN(m))
      .reduce((sum, m) => sum + m, 0) / similarCars.length;
    
    const userMileage = parseInt(mileage.replace(/[^0-9]/g, ''));
    if (!isNaN(userMileage) && !isNaN(avgMileage)) {
      const mileageDiff = avgMileage - userMileage;
      // Adjust price by $0.10 per mile difference
      estimatedPrice += mileageDiff * 0.10;
    }
  }
  
  // Adjust for accident history
  if (accident === 'yes') {
    estimatedPrice *= 0.85; // 15% reduction for accident history
  }
  
  // Adjust for clean title
  if (cleanTitle === 'no') {
    estimatedPrice *= 0.80; // 20% reduction for non-clean title
  }
  
  res.json({
    estimatedPrice: Math.round(estimatedPrice),
    similarCars: similarCars.length,
    priceRange: {
      min: Math.min(...similarCars.map(car => car.price)),
      max: Math.max(...similarCars.map(car => car.price))
    }
  });
});

// Endpoint to upload a new car listing
app.post('/api/upload', upload.single('carData'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({ 
    message: 'File uploaded successfully', 
    filename: req.file.originalname 
  });
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Start the server
app.listen(port, () => {
  console.log(`Car Price Estimator app listening at http://localhost:${port}`);
});