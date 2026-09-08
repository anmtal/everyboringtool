"use client";

import { useMemo, useState } from "react";

// Efficiency modes and the litres-per-km each one produces from its raw value.
// Everything is normalised to litres per kilometre internally.
const KM_PER_MILE = 1.609344;
const LITRES_PER_GALLON_US = 3.785411784;
const LITRES_PER_GALLON_UK = 4.54609;

export default function FuelCostCalculator() {
  const [distance, setDistance] = useState("300");
  const [distanceUnit, setDistanceUnit] = useState("mi"); // mi | km
  const [roundTrip, setRoundTrip] = useState(false);

  const [efficiency, setEfficiency] = useState("30");
  const [efficiencyUnit, setEfficiencyUnit] = useState("mpg-us"); // mpg-us | mpg-uk | l100km | kml

  const [price, setPrice] = useState("3.50");
  const [priceUnit, setPriceUnit] = useState("gal-us"); // gal-us | gal-uk | litre

  const [passengers, setPassengers] = useState("1");
  const [trips, setTrips] = useState("1"); // e.g. round trips per week/month

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const num = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }),
    []
  );

  const results = useMemo(() => {
    const dist = parseFloat(distance);
    const eff = parseFloat(efficiency);
    const pr = parseFloat(price);
    const pax = Math.max(1, Math.floor(parseFloat(passengers) || 1));
    const tripCount = Math.max(1, parseFloat(trips) || 1);

    if (
      !Number.isFinite(dist) ||
      !Number.isFinite(eff) ||
      !Number.isFinite(pr) ||
      dist <= 0 ||
      eff <= 0 ||
      pr < 0
    ) {
      return null;
    }

    // One-way distance in kilometres.
    let distKm = distanceUnit === "mi" ? dist * KM_PER_MILE : dist;
    if (roundTrip) distKm *= 2;

    // Convert efficiency to litres consumed per kilometre.
    let litresPerKm;
    if (efficiencyUnit === "mpg-us") {
      // miles per US gallon
      const kmPerLitre = (eff * KM_PER_MILE) / LITRES_PER_GALLON_US;
      litresPerKm = 1 / kmPerLitre;
    } else if (efficiencyUnit === "mpg-uk") {
      const kmPerLitre = (eff * KM_PER_MILE) / LITRES_PER_GALLON_UK;
      litresPerKm = 1 / kmPerLitre;
    } else if (efficiencyUnit === "kml") {
      // kilometres per litre
      litresPerKm = 1 / eff;
    } else {
      // l100km: litres per 100 km
      litresPerKm = eff / 100;
    }

    if (!Number.isFinite(litresPerKm) || litresPerKm <= 0) return null;

    // Convert fuel price to price per litre.
    let pricePerLitre;
    if (priceUnit === "gal-us") {
      pricePerLitre = pr / LITRES_PER_GALLON_US;
    } else if (priceUnit === "gal-uk") {
      pricePerLitre = pr / LITRES_PER_GALLON_UK;
    } else {
      pricePerLitre = pr;
    }

    // Per single trip figures.
    const litresPerTrip = distKm * litresPerKm;
    const costPerTrip = litresPerTrip * pricePerLitre;

    // Totals across the number of trips entered.
    const totalLitres = litresPerTrip * tripCount;
    const totalCost = costPerTrip * tripCount;

    // Fuel volume in the user's familiar unit.
    let volumeValue = totalLitres;
    let volumeLabel = "Litres of fuel";
    if (priceUnit === "gal-us") {
      volumeValue = totalLitres / LITRES_PER_GALLON_US;
      volumeLabel = "US gallons";
    } else if (priceUnit === "gal-uk") {
      volumeValue = totalLitres / LITRES_PER_GALLON_UK;
      volumeLabel = "UK gallons";
    }

    // Cost per distance unit (single trip, one-way-or-round as chosen).
    const distDisplay =
      distanceUnit === "mi" ? distKm / KM_PER_MILE : distKm;
    const costPerUnit = distDisplay > 0 ? costPerTrip / distDisplay : 0;

    return {
      costPerTrip,
      totalCost,
      totalLitres,
      volumeValue,
      volumeLabel,
      costPerUnit,
      distanceUnit,
      pax,
      perPersonTotal: totalCost / pax,
      tripCount,
    };
  }, [
    distance,
    distanceUnit,
    roundTrip,
    efficiency,
    efficiencyUnit,
    price,
    priceUnit,
    passengers,
    trips,
  ]);

  const showTripBreakdown =
    results && (results.tripCount > 1 || results.pax > 1);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-distance">
              Trip distance
            </label>
            <input
              className="tool-input"
              id="fuel-distance"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="300"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-distance-unit">
              Distance unit
            </label>
            <select
              className="tool-select"
              id="fuel-distance-unit"
              value={distanceUnit}
              onChange={(e) => setDistanceUnit(e.target.value)}
            >
              <option value="mi">Miles</option>
              <option value="km">Kilometres</option>
            </select>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="fuel-roundtrip">
            <input
              id="fuel-roundtrip"
              type="checkbox"
              checked={roundTrip}
              onChange={(e) => setRoundTrip(e.target.checked)}
            />{" "}
            Round trip (there and back)
          </label>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-efficiency">
              Fuel efficiency
            </label>
            <input
              className="tool-input"
              id="fuel-efficiency"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="30"
              value={efficiency}
              onChange={(e) => setEfficiency(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-efficiency-unit">
              Efficiency unit
            </label>
            <select
              className="tool-select"
              id="fuel-efficiency-unit"
              value={efficiencyUnit}
              onChange={(e) => setEfficiencyUnit(e.target.value)}
            >
              <option value="mpg-us">MPG (US)</option>
              <option value="mpg-uk">MPG (UK/Imperial)</option>
              <option value="l100km">L / 100 km</option>
              <option value="kml">km / litre</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-price">
              Fuel price
            </label>
            <input
              className="tool-input"
              id="fuel-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="3.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-price-unit">
              Price per
            </label>
            <select
              className="tool-select"
              id="fuel-price-unit"
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value)}
            >
              <option value="gal-us">US gallon</option>
              <option value="gal-uk">UK gallon</option>
              <option value="litre">Litre</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-trips">
              Number of trips
            </label>
            <input
              className="tool-input"
              id="fuel-trips"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="1"
              value={trips}
              onChange={(e) => setTrips(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="fuel-passengers">
              Split between people
            </label>
            <input
              className="tool-input"
              id="fuel-passengers"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="1"
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {results.tripCount > 1 ? "TOTAL FUEL COST" : "TRIP FUEL COST"}
            </p>
            <div className="tool-result-value">
              {currency.format(results.totalCost)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.costPerTrip)}
              </div>
              <div className="tool-stat-label">Cost per trip</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {num.format(results.volumeValue)}
              </div>
              <div className="tool-stat-label">{results.volumeLabel}</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.costPerUnit)}
              </div>
              <div className="tool-stat-label">
                Cost per {results.distanceUnit === "mi" ? "mile" : "km"}
              </div>
            </div>
            {showTripBreakdown && results.pax > 1 ? (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {currency.format(results.perPersonTotal)}
                </div>
                <div className="tool-stat-label">
                  Per person ({results.pax})
                </div>
              </div>
            ) : null}
          </div>

          <p className="tool-note">
            Cost = distance divided by fuel efficiency, multiplied by the fuel
            price. All units are converted internally, so you can mix miles with
            L/100&nbsp;km or gallons however your car and pump are labelled. This
            is an estimate for planning; real usage varies with traffic, load,
            terrain, and driving style.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a trip distance, your car&apos;s fuel efficiency, and the fuel
          price to estimate the cost of the drive.
        </p>
      )}
    </div>
  );
}
