import React, { useState, useEffect } from 'react';
import './RoutePlanner.css';

const RoutePlanner = ({ customers, onBack }) => {
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [routeMode, setRouteMode] = useState('out-and-back'); // or 'round-trip'
  const [homeAddress, setHomeAddress] = useState('Canton, SD'); // User's home base
  const [targetReturnTime, setTargetReturnTime] = useState('17:00');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Filters
  const [stateFilter, setStateFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  
  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState(() => {
    const saved = localStorage.getItem('savedRoutes');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAllOnMap, setShowAllOnMap] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found! Make sure .env.local exists with REACT_APP_GOOGLE_MAPS_API_KEY');
      return;
    }

    // Check if already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps');
      alert('Failed to load Google Maps. Check your API key and internet connection.');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Get unique states and cities
  const states = ['All', ...new Set(customers.filter(c => c.active).map(c => c.state).filter(Boolean))].sort();
  const cities = ['All', ...new Set(
    customers
      .filter(c => c.active && (stateFilter === 'All' || c.state === stateFilter))
      .map(c => c.city?.trim()) // Trim whitespace
      .filter(Boolean)
  )].sort();
  const stages = ['All', 'Hot', 'Warm', 'Cold', 'Lead', 'Scouting'];

  // Filter customers based on selections
  const filteredCustomers = customers.filter(c => {
    if (!c.active) return false;
    if (stateFilter !== 'All' && c.state !== stateFilter) return false;
    if (cityFilter !== 'All' && c.city?.trim() !== cityFilter) return false;
    if (stageFilter !== 'All' && c.leadStage !== stageFilter) return false;
    return true;
  });

  // Reset city filter when state changes
  useEffect(() => {
    setCityFilter('All');
  }, [stateFilter]);

  // Save routes to localStorage
  useEffect(() => {
    localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes));
  }, [savedRoutes]);

  // Save current route
  const saveCurrentRoute = () => {
    if (!routeName.trim()) {
      alert('Please enter a route name');
      return;
    }
    
    const newRoute = {
      id: Date.now().toString(),
      name: routeName,
      customerIds: selectedCustomers,
      routeMode,
      homeAddress,
      stateFilter,
      cityFilter,
      stageFilter,
      createdDate: new Date().toISOString()
    };
    
    setSavedRoutes([...savedRoutes, newRoute]);
    setRouteName('');
    setShowSaveDialog(false);
    alert(`Route "${newRoute.name}" saved!`);
  };

  // Load a saved route
  const loadRoute = (savedRoute) => {
    setSelectedCustomers(savedRoute.customerIds);
    setRouteMode(savedRoute.routeMode);
    setHomeAddress(savedRoute.homeAddress);
    setStateFilter(savedRoute.stateFilter || 'All');
    setCityFilter(savedRoute.cityFilter || 'All');
    setStageFilter(savedRoute.stageFilter || 'All');
    setRoute(null); // Clear calculated route
    setShowSavedRoutes(false);
    alert(`Loaded route: ${savedRoute.name}`);
  };

  // Delete a saved route
  const deleteSavedRoute = (routeId) => {
    if (window.confirm('Delete this saved route?')) {
      setSavedRoutes(savedRoutes.filter(r => r.id !== routeId));
    }
  };

  // Toggle customer selection
  const toggleCustomer = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  // Select all customers in a state
  const selectAllInState = (state) => {
    const stateCustomers = customers
      .filter(c => c.state === state && c.active)
      .map(c => c.id);
    setSelectedCustomers(prev => {
      const newSet = new Set([...prev, ...stateCustomers]);
      return Array.from(newSet);
    });
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedCustomers([]);
  };

  // Calculate route
  const calculateRoute = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    if (!window.google || !window.google.maps) {
      alert('Google Maps is not loaded yet. Please wait a moment and try again.');
      return;
    }

    setLoading(true);

    try {
      const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
      
      // Build addresses
      const destinations = selectedCustomerData.map(c => ({
        customer: c,
        address: `${c.address || ''} ${c.city}, ${c.state} ${c.zip || ''}`.trim()
      }));

      // Create DirectionsService
      const directionsService = new window.google.maps.DirectionsService();
      
      // For Out and Back: Start from home, visit furthest first, return home
      if (routeMode === 'out-and-back') {
        // Calculate distances from home to each destination
        const distanceService = new window.google.maps.DistanceMatrixService();
        
        const distancePromise = new Promise((resolve, reject) => {
          distanceService.getDistanceMatrix({
            origins: [homeAddress],
            destinations: destinations.map(d => d.address),
            travelMode: 'DRIVING'
          }, (response, status) => {
            if (status === 'OK') {
              resolve(response);
            } else {
              reject(status);
            }
          });
        });

        const distanceMatrix = await distancePromise;
        
        // Sort destinations by distance (furthest first)
        const destinationsWithDistance = destinations.map((dest, idx) => ({
          ...dest,
          distance: distanceMatrix.rows[0].elements[idx].distance?.value || 0
        }));
        
        destinationsWithDistance.sort((a, b) => b.distance - a.distance);
        
        // Build waypoints (all except last one)
        const waypoints = destinationsWithDistance.slice(0, -1).map(d => ({
          location: d.address,
          stopover: true
        }));

        // Get directions
        const directionsPromise = new Promise((resolve, reject) => {
          directionsService.route({
            origin: homeAddress,
            destination: destinationsWithDistance[destinationsWithDistance.length - 1].address,
            waypoints: waypoints,
            optimizeWaypoints: false, // We already sorted them
            travelMode: 'DRIVING'
          }, (result, status) => {
            if (status === 'OK') {
              resolve(result);
            } else {
              reject(status);
            }
          });
        });

        const directions = await directionsPromise;
        
        // Calculate total distance and time
        let totalDistance = 0;
        let totalTime = 0;
        
        directions.routes[0].legs.forEach(leg => {
          totalDistance += leg.distance.value;
          totalTime += leg.duration.value;
        });

        setRoute({
          directions,
          customers: destinationsWithDistance.map(d => d.customer),
          totalDistance: (totalDistance / 1609.34).toFixed(1), // Convert to miles
          totalTime: Math.round(totalTime / 60), // Convert to minutes
          mode: 'out-and-back'
        });
      } else {
        // Round trip: Optimize the route
        const waypoints = destinations.map(d => ({
          location: d.address,
          stopover: true
        }));

        const directionsPromise = new Promise((resolve, reject) => {
          directionsService.route({
            origin: homeAddress,
            destination: homeAddress,
            waypoints: waypoints,
            optimizeWaypoints: true,
            travelMode: 'DRIVING'
          }, (result, status) => {
            if (status === 'OK') {
              resolve(result);
            } else {
              reject(status);
            }
          });
        });

        const directions = await directionsPromise;
        
        // Get optimized order
        const waypointOrder = directions.routes[0].waypoint_order;
        const optimizedCustomers = waypointOrder.map(idx => destinations[idx].customer);
        
        // Calculate total distance and time
        let totalDistance = 0;
        let totalTime = 0;
        
        directions.routes[0].legs.forEach(leg => {
          totalDistance += leg.distance.value;
          totalTime += leg.duration.value;
        });

        setRoute({
          directions,
          customers: optimizedCustomers,
          totalDistance: (totalDistance / 1609.34).toFixed(1), // Convert to miles
          totalTime: Math.round(totalTime / 60), // Convert to minutes
          mode: 'round-trip'
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('Error calculating route. Please check the addresses and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render map
  useEffect(() => {
    if (route && mapLoaded && window.google) {
      const mapDiv = document.getElementById('route-map');
      if (!mapDiv) return;

      const map = new window.google.maps.Map(mapDiv, {
        zoom: 7,
        center: { lat: 43.5, lng: -96.5 } // Roughly South Dakota area
      });

      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        directions: route.directions
      });
    }
  }, [route, mapLoaded]);

  // Render all customers on map
  useEffect(() => {
    if (showAllOnMap && mapLoaded && window.google) {
      const mapDiv = document.getElementById('all-customers-map');
      if (!mapDiv) return;

      const map = new window.google.maps.Map(mapDiv, {
        zoom: 7,
        center: { lat: 43.5, lng: -96.5 }
      });

      const bounds = new window.google.maps.LatLngBounds();
      const geocoder = new window.google.maps.Geocoder();

      // Geocode and add markers for each customer
      filteredCustomers.forEach(customer => {
        const address = `${customer.address ? customer.address + ', ' : ''}${customer.city}, ${customer.state} ${customer.zip}`;
        
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const position = results[0].geometry.location;
            
            // Create marker
            const marker = new window.google.maps.Marker({
              map,
              position,
              title: customer.name,
              label: {
                text: customer.name.substring(0, 1),
                color: 'white',
                fontWeight: 'bold'
              }
            });

            // Create info window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px;">
                  <strong style="font-size: 16px;">${customer.name}</strong>
                  ${customer.company ? `<div style="color: #6b7280; margin-top: 4px;">${customer.company}</div>` : ''}
                  <div style="margin-top: 8px;">
                    <div>📍 ${customer.city}, ${customer.state}</div>
                    <div style="margin-top: 4px;">📞 ${customer.primaryPhone || 'No phone'}</div>
                    <div style="margin-top: 4px;">
                      <span style="background: #${customer.leadStage === 'Hot' ? 'ef4444' : customer.leadStage === 'Warm' ? 'f59e0b' : customer.leadStage === 'Cold' ? '3b82f6' : '6b7280'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                        ${customer.leadStage}
                      </span>
                    </div>
                  </div>
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });

            bounds.extend(position);
            
            // Fit map to show all markers
            if (filteredCustomers.length > 1) {
              map.fitBounds(bounds);
            } else {
              map.setCenter(position);
              map.setZoom(12);
            }
          }
        });
      });
    }
  }, [showAllOnMap, mapLoaded, filteredCustomers]);

  // Group filtered customers by state
  const customersByState = {};
  filteredCustomers.forEach(customer => {
    const state = customer.state || 'Unknown';
    if (!customersByState[state]) {
      customersByState[state] = [];
    }
    customersByState[state].push(customer);
  });

  const stateGroups = Object.keys(customersByState).sort();

  return (
    <div className="route-planner">
      <div className="route-header">
        <button className="btn-back" onClick={onBack}>← Back to Customers</button>
        <h1>🗺️ Route Planner</h1>
      </div>

      {!route && !showAllOnMap ? (
        <div className="route-setup">
          <div className="setup-panel">
            <div className="setup-section">
              <h2>1. Set Your Home Base</h2>
              <input
                type="text"
                className="home-input"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                placeholder="Your starting location (e.g., Canton, SD)"
              />
            </div>

            <div className="setup-section">
              <h2>2. Choose Route Mode</h2>
              <div className="route-mode-buttons">
                <button
                  className={`mode-btn ${routeMode === 'out-and-back' ? 'active' : ''}`}
                  onClick={() => setRouteMode('out-and-back')}
                >
                  <div className="mode-title">🏃 Out and Back</div>
                  <div className="mode-desc">Visit furthest first, work back home</div>
                </button>
                <button
                  className={`mode-btn ${routeMode === 'round-trip' ? 'active' : ''}`}
                  onClick={() => setRouteMode('round-trip')}
                >
                  <div className="mode-title">🔄 Round Trip</div>
                  <div className="mode-desc">Optimized loop, return home</div>
                </button>
              </div>
            </div>

            <div className="setup-section">
              <div className="section-header-with-button">
                <h2>3. Filter & Select Customers ({selectedCustomers.length} selected)</h2>
                <button 
                  className="btn btn-primary btn-small"
                  onClick={() => setShowSavedRoutes(!showSavedRoutes)}
                >
                  {showSavedRoutes ? 'Hide' : '📁 My Saved Routes'} ({savedRoutes.length})
                </button>
              </div>

              {/* Saved Routes Panel */}
              {showSavedRoutes && (
                <div className="saved-routes-panel">
                  <h3>📁 Saved Routes</h3>
                  {savedRoutes.length === 0 ? (
                    <p className="empty-state">No saved routes yet. Create a route and click "Save Route" to save it!</p>
                  ) : (
                    <div className="saved-routes-list">
                      {savedRoutes.map(savedRoute => (
                        <div key={savedRoute.id} className="saved-route-item">
                          <div className="saved-route-info">
                            <strong>{savedRoute.name}</strong>
                            <span className="saved-route-meta">
                              {savedRoute.customerIds.length} customers • 
                              {savedRoute.routeMode === 'out-and-back' ? ' Out & Back' : ' Round Trip'} • 
                              {new Date(savedRoute.createdDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="saved-route-actions">
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => loadRoute(savedRoute)}
                            >
                              Load
                            </button>
                            <button 
                              className="btn-icon"
                              onClick={() => deleteSavedRoute(savedRoute.id)}
                              title="Delete route"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Filters */}
              <div className="filters-panel">
                <div className="filter-group">
                  <label>State:</label>
                  <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                    {states.map(state => (
                      <option key={state} value={state}>
                        {state} {state !== 'All' ? `(${customers.filter(c => c.active && c.state === state).length})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>City:</label>
                  <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                    {cities.map(city => (
                      <option key={city} value={city}>
                        {city} {city !== 'All' ? `(${customers.filter(c => c.active && c.city === city).length})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Lead Stage:</label>
                  <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                    {stages.map(stage => (
                      <option key={stage} value={stage}>
                        {stage} {stage !== 'All' ? `(${customers.filter(c => c.active && c.leadStage === stage).length})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {(stateFilter !== 'All' || cityFilter !== 'All' || stageFilter !== 'All') && (
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => {
                      setStateFilter('All');
                      setCityFilter('All');
                      setStageFilter('All');
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="filter-results">
                Showing {filteredCustomers.length} of {customers.filter(c => c.active).length} customers
              </div>

              <div className="selection-controls">
                <button className="btn btn-secondary btn-small" onClick={clearSelections}>
                  Clear All
                </button>
              </div>

              <div className="customer-selection">
                {stateGroups.map(state => (
                  <div key={state} className="state-group">
                    <div className="state-header">
                      <h3>{state} ({customersByState[state].length})</h3>
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => selectAllInState(state)}
                      >
                        Select All
                      </button>
                    </div>
                    <div className="customer-checkboxes">
                      {customersByState[state].map(customer => (
                        <label key={customer.id} className="customer-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(customer.id)}
                            onChange={() => toggleCustomer(customer.id)}
                          />
                          <span className="customer-checkbox-label">
                            <strong>{customer.name}</strong>
                            {customer.company && <span> - {customer.company}</span>}
                            <span className="customer-location">
                              {customer.city}, {customer.state}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="setup-section">
              <div className="route-action-buttons">
                <button
                  className="btn btn-primary btn-large"
                  onClick={calculateRoute}
                  disabled={loading || selectedCustomers.length === 0 || !mapLoaded}
                >
                  {loading ? '🔄 Calculating Route...' : '🗺️ Calculate Route'}
                </button>
                <button
                  className="btn btn-success btn-large"
                  onClick={() => setShowAllOnMap(true)}
                  disabled={!mapLoaded || filteredCustomers.length === 0}
                >
                  📍 Show All on Map
                </button>
                <button
                  className="btn btn-secondary btn-large"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={selectedCustomers.length === 0}
                >
                  💾 Save Route
                </button>
              </div>
              {!mapLoaded && (
                <div className="loading-maps">⏳ Loading Google Maps...</div>
              )}
              
              {/* Save Route Dialog */}
              {showSaveDialog && (
                <div className="save-dialog">
                  <h3>💾 Save Route</h3>
                  <input
                    type="text"
                    className="route-name-input"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="Enter route name (e.g., Canton Loop - March 5)"
                    maxLength={50}
                  />
                  <div className="save-dialog-actions">
                    <button className="btn btn-primary" onClick={saveCurrentRoute}>
                      Save
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setShowSaveDialog(false);
                        setRouteName('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : showAllOnMap ? (
        <div className="map-view-results">
          <div className="results-header">
            <h2>📍 All Customers on Map</h2>
            <div className="route-actions">
              <button className="btn btn-secondary" onClick={() => setShowAllOnMap(false)}>
                ← Back to Route Planning
              </button>
            </div>
          </div>

          <div className="map-view-info">
            <div className="info-stat">
              <div className="info-label">Showing</div>
              <div className="info-value">{filteredCustomers.length} customers</div>
            </div>
            {stateFilter !== 'All' && (
              <div className="info-stat">
                <div className="info-label">State</div>
                <div className="info-value">{stateFilter}</div>
              </div>
            )}
            {cityFilter !== 'All' && (
              <div className="info-stat">
                <div className="info-label">City</div>
                <div className="info-value">{cityFilter}</div>
              </div>
            )}
            {stageFilter !== 'All' && (
              <div className="info-stat">
                <div className="info-label">Stage</div>
                <div className="info-value">{stageFilter}</div>
              </div>
            )}
          </div>

          <div 
            id="all-customers-map" 
            style={{ 
              width: '100%', 
              height: '600px', 
              borderRadius: '12px',
              marginTop: '1rem'
            }}
          ></div>

          <div className="customer-list-sidebar">
            <h3>📋 Customer List ({filteredCustomers.length})</h3>
            <div className="customers-scroll">
              {filteredCustomers.map(customer => (
                <div key={customer.id} className="customer-list-item">
                  <div className="customer-list-name">
                    <strong>{customer.name}</strong>
                    {customer.company && <span className="customer-company"> - {customer.company}</span>}
                  </div>
                  <div className="customer-list-location">
                    📍 {customer.city}, {customer.state}
                  </div>
                  <div className="customer-list-stage">
                    <span className={`badge-small badge-${customer.leadStage?.toLowerCase()}`}>
                      {customer.leadStage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="route-results">
          <div className="results-header">
            <h2>📍 Your Route</h2>
            <div className="route-actions">
              <button className="btn btn-secondary" onClick={() => setRoute(null)}>
                ← Edit Route
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                🖨️ Print
              </button>
            </div>
          </div>

          <div className="route-summary">
            <div className="summary-stat">
              <div className="summary-label">Total Distance</div>
              <div className="summary-value">{route.totalDistance} miles</div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">Drive Time</div>
              <div className="summary-value">
                {Math.floor(route.totalTime / 60)}h {route.totalTime % 60}m
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">Stops</div>
              <div className="summary-value">{route.customers.length}</div>
            </div>
            <div className="summary-stat">
              <div className="summary-label">Mode</div>
              <div className="summary-value">
                {route.mode === 'out-and-back' ? 'Out & Back' : 'Round Trip'}
              </div>
            </div>
          </div>

          <div className="route-content">
            <div className="route-map-container">
              <div id="route-map" style={{ width: '100%', height: '500px' }}></div>
            </div>

            <div className="route-stops">
              <h3>Stop Order</h3>
              <div className="stops-list">
                <div className="stop-item start">
                  <div className="stop-number">START</div>
                  <div className="stop-details">
                    <div className="stop-name">🏠 {homeAddress}</div>
                  </div>
                </div>

                {route.customers.map((customer, idx) => (
                  <div key={customer.id} className="stop-item">
                    <div className="stop-number">{idx + 1}</div>
                    <div className="stop-details">
                      <div className="stop-name">{customer.name}</div>
                      {customer.company && <div className="stop-company">{customer.company}</div>}
                      <div className="stop-address">
                        {customer.address && `${customer.address}, `}
                        {customer.city}, {customer.state} {customer.zip}
                      </div>
                      {customer.contacts && customer.contacts[0] && (
                        <div className="stop-contact">
                          📞 {customer.contacts[0].phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {route.mode === 'round-trip' && (
                  <div className="stop-item end">
                    <div className="stop-number">END</div>
                    <div className="stop-details">
                      <div className="stop-name">🏠 {homeAddress}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;