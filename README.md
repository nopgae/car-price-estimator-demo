# Car Price Estimator Demo

A small Express + vanilla JS app that estimates a used car's price from comparable listings. Pick a brand, model and year (plus optional mileage, accident history and title status), and the app averages the prices of similar cars in a 4,009-listing dataset and shows the price spread and a price-vs-mileage chart.

## How the estimate works

1. Comparable cars = same brand and model, model year within ±2 years (`data/used_cars.csv`: 57 brands, model years 1974–2024).
2. Start from the mean price of those cars.
3. Adjust by $0.10 per mile of difference from their average mileage, −15% if there was an accident, −20% if the title is not clean.
4. Return the estimate, the min/max of the comparables, and the comparables themselves for the charts and table.

## Project Structure

```
car-price-estimator-demo/
├── index.js            # Express server: /api/brands, /api/models/:brand, /api/estimate
├── public/index.html   # Form, charts (Chart.js), similar-cars table
├── data/used_cars.csv  # Used-car listings (price, mileage, accident, title, ...)
└── package.json
```

## Run

```bash
npm install
npm start          # http://localhost:3000
```

## Limitations

- The adjustments (−$0.10/mile, −15%, −20%) are hand-picked rules, not fitted to the data, and the estimate was not validated against held-out listings.
- No image recognition: the app takes make/model/year from the form. `index.js` still has an unused `/api/upload` endpoint, and `public/test.html` calls endpoints (`/api/status`, `/api/cars`) that don't exist.
- Models with no listing within ±2 years return "Not enough data" rather than an estimate.

## License

ISC
