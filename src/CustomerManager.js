import React, { useState, useEffect } from 'react';
import './CustomerManager.css';
import RoutePlanner from './RoutePlanner';

// Helper function to load customers from localStorage
const loadCustomersFromStorage = () => {
  try {
    const stored = localStorage.getItem('primrose-customers');
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log(`✅ Loaded ${parsed.length} customers from localStorage`);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading customers from localStorage:', error);
  }
  return [];
};

const CustomerManager = () => {
  // Initialize state DIRECTLY from localStorage (not in useEffect!)
  // This prevents empty array from ever being the initial state
  const [customers, setCustomers] = useState(() => loadCustomersFromStorage());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc'); // New sort state
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null); // For clickable stats

  // Save customers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('primrose-customers', JSON.stringify(customers));
    console.log(`💾 Saved ${customers.length} customers to localStorage`);
  }, [customers]);

  // Lead stages
  const leadStages = ['Scouting', 'Lead', 'Cold', 'Warm', 'Hot'];

  // US States
  const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  // Demo types
  const demoTypes = ['Phaser', 'Grease', 'Engine Oil', 'Hydraulic Fluid', 'Gear Oil'];

  // Add or update customer
  const handleSaveCustomer = (customerData) => {
    if (editingCustomer) {
      // Update existing
      const updatedCustomer = { ...customerData, id: editingCustomer.id };
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id ? updatedCustomer : c
      ));
      // Re-select the customer to stay on their detail page
      setSelectedCustomer(updatedCustomer);
    } else {
      // Check for duplicate before adding new customer
      const duplicateCheck = customers.find(c => 
        c.name.toLowerCase().trim() === customerData.name.toLowerCase().trim() &&
        c.active === true
      );
      
      if (duplicateCheck) {
        const proceed = window.confirm(
          `⚠️ DUPLICATE CUSTOMER DETECTED!\n\n` +
          `A customer named "${duplicateCheck.name}" already exists.\n\n` +
          `Company: ${duplicateCheck.company || 'N/A'}\n` +
          `Location: ${duplicateCheck.city}, ${duplicateCheck.state}\n` +
          `Phone: ${duplicateCheck.primaryPhone || 'N/A'}\n\n` +
          `Do you still want to add this customer?\n\n` +
          `Click OK to add anyway, or Cancel to go back.`
        );
        
        if (!proceed) {
          return; // Don't add duplicate
        }
      }
      
      // Add new
      const newCustomer = {
        ...customerData,
        id: Date.now(),
        dateAdded: new Date().toISOString(),
        active: true
      };
      setCustomers([...customers, newCustomer]);
      // Select the new customer to view their detail page
      setSelectedCustomer(newCustomer);
    }
    setShowForm(false);
    setEditingCustomer(null);
  };

  // Delete customer
  const handleDeleteCustomer = (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setCustomers(customers.filter(c => c.id !== id));
      setSelectedCustomer(null);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = (customer) => {
    const reason = customer.active 
      ? prompt('Why is this customer becoming inactive?\n\nOptions:\n- Not interested\n- Bad timing\n- Using competitor\n- Too expensive\n- Asked not to return\n- Out of business\n- Other')
      : null;
    
    if (customer.active && !reason) return; // Cancelled

    setCustomers(customers.map(c => 
      c.id === customer.id 
        ? { ...c, active: !c.active, inactiveReason: reason || c.inactiveReason }
        : c
    ));
  };

  // Filter customers - Enhanced search across ALL fields
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm || !searchTerm.trim()) {
      // No search term, just apply stage filter
      const matchesStage = filterStage === 'All' || customer.leadStage === filterStage;
      return matchesStage;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    // Search in basic customer info
    const matchesBasicInfo = 
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.company?.toLowerCase().includes(searchLower) ||
      customer.city?.toLowerCase().includes(searchLower) ||
      customer.state?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower) ||
      customer.zip?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.referralSource?.toLowerCase().includes(searchLower);
    
    // Search in phone numbers (remove formatting for search)
    const searchDigits = searchTerm.replace(/\D/g, '');
    const matchesPhone = searchDigits.length > 0 && 
      customer.primaryPhone?.replace(/\D/g, '').includes(searchDigits);
    
    // Search in all contacts
    const matchesContacts = customer.contacts?.some(contact =>
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.title?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      (searchDigits.length > 0 && contact.phone?.replace(/\D/g, '').includes(searchDigits)) ||
      contact.bestTime?.toLowerCase().includes(searchLower)
    );
    
    // Search in all notes
    const matchesNotes = customer.notes?.some(note =>
      note.text?.toLowerCase().includes(searchLower) ||
      note.contactName?.toLowerCase().includes(searchLower)
    );
    
    // Search in demo types
    const matchesDemos = customer.demos && Object.keys(customer.demos).some(demoType =>
      customer.demos[demoType].completed && demoType.toLowerCase().includes(searchLower)
    );
    
    const matchesSearch = matchesBasicInfo || matchesPhone || matchesContacts || matchesNotes || matchesDemos;
    const matchesStage = filterStage === 'All' || customer.leadStage === filterStage;
    
    return matchesSearch && matchesStage;
  });

  // Helper function to extract last name from full name
  const getLastName = (fullName) => {
    if (!fullName || !fullName.trim()) return '';
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1]; // Last word is the last name
  };

  // Sort customers based on selected sort option
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        // Sort by last name, then first name if last names match
        const lastNameCompare = getLastName(a.name).localeCompare(getLastName(b.name));
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.name.localeCompare(b.name);
      
      case 'name-desc':
        // Sort by last name descending, then first name if last names match
        const lastNameCompareDesc = getLastName(b.name).localeCompare(getLastName(a.name));
        if (lastNameCompareDesc !== 0) return lastNameCompareDesc;
        return b.name.localeCompare(a.name);
      
      case 'date-newest':
        return new Date(b.dateAdded) - new Date(a.dateAdded);
      
      case 'date-oldest':
        return new Date(a.dateAdded) - new Date(b.dateAdded);
      
      case 'followup-soonest':
        // Put customers without follow-up date at the end
        if (!a.followUpDate && !b.followUpDate) return 0;
        if (!a.followUpDate) return 1;
        if (!b.followUpDate) return -1;
        return new Date(a.followUpDate) - new Date(b.followUpDate);
      
      case 'stage-priority':
        // Hot → Warm → Cold → Lead → Scouting
        const stageOrder = { 'Hot': 1, 'Warm': 2, 'Cold': 3, 'Lead': 4, 'Scouting': 5 };
        return (stageOrder[a.leadStage] || 99) - (stageOrder[b.leadStage] || 99);
      
      case 'city-asc':
        return (a.city || '').localeCompare(b.city || '');
      
      case 'state-asc':
        return (a.state || '').localeCompare(b.state || '');
      
      default:
        return 0;
    }
  });

  // Active customers only
  const activeCustomers = sortedCustomers.filter(c => c.active);
  const inactiveCustomers = sortedCustomers.filter(c => !c.active);

  // Calculate follow-up alerts
  const calculateFollowUpAlerts = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    const today = now.getTime();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).getTime();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).getTime();
    
    const overdue = [];
    const thisWeek = [];
    const nextWeek = [];
    
    activeCustomers.forEach(customer => {
      if (!customer.followUpDate) return;
      
      const followUpTime = new Date(customer.followUpDate).getTime();
      const daysUntil = Math.round((followUpTime - today) / (24 * 60 * 60 * 1000));
      
      const customerWithDays = { ...customer, daysUntil };
      
      if (followUpTime < today) {
        overdue.push(customerWithDays);
      } else if (followUpTime <= weekFromNow) {
        thisWeek.push(customerWithDays);
      } else if (followUpTime <= twoWeeksFromNow) {
        nextWeek.push(customerWithDays);
      }
    });
    
    // Sort by days (most urgent first)
    overdue.sort((a, b) => a.daysUntil - b.daysUntil);
    thisWeek.sort((a, b) => a.daysUntil - b.daysUntil);
    nextWeek.sort((a, b) => a.daysUntil - b.daysUntil);
    
    return { overdue, thisWeek, nextWeek };
  };

  const calculateDeliveryAlerts = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const today = now.getTime();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).getTime();
    
    const overdue = [];
    const thisWeek = [];
    const upcoming = [];
    
    activeCustomers.forEach(customer => {
      if (!customer.orderPendingDelivery) return;
      
      const deliveryTime = customer.expectedDeliveryDate 
        ? new Date(customer.expectedDeliveryDate).getTime()
        : null;
      
      if (!deliveryTime) {
        // No date set, but order pending
        upcoming.push({ ...customer, daysUntil: null });
        return;
      }
      
      const daysUntil = Math.round((deliveryTime - today) / (24 * 60 * 60 * 1000));
      const customerWithDays = { ...customer, daysUntil };
      
      if (deliveryTime < today) {
        overdue.push(customerWithDays);
      } else if (deliveryTime <= weekFromNow) {
        thisWeek.push(customerWithDays);
      } else {
        upcoming.push(customerWithDays);
      }
    });
    
    // Sort by days
    overdue.sort((a, b) => a.daysUntil - b.daysUntil);
    thisWeek.sort((a, b) => a.daysUntil - b.daysUntil);
    upcoming.sort((a, b) => {
      if (a.daysUntil === null) return 1;
      if (b.daysUntil === null) return -1;
      return a.daysUntil - b.daysUntil;
    });
    
    return { overdue, thisWeek, upcoming };
  };
  
  const followUpAlerts = calculateFollowUpAlerts();
  const deliveryAlerts = calculateDeliveryAlerts();

  // Calculate stats for dashboard
  const calculateStats = () => {
    // Customers by state
    const byState = {};
    activeCustomers.forEach(customer => {
      const state = customer.state || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });
    const stateStats = Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .map(([state, count]) => ({ state, count }));

    // Customers by lead stage
    const byStage = {};
    activeCustomers.forEach(customer => {
      const stage = customer.leadStage || 'Unknown';
      byStage[stage] = (byStage[stage] || 0) + 1;
    });
    const stageStats = ['Hot', 'Warm', 'Cold', 'Lead', 'Scouting'].map(stage => ({
      stage,
      count: byStage[stage] || 0,
      percentage: activeCustomers.length > 0 
        ? Math.round(((byStage[stage] || 0) / activeCustomers.length) * 100) 
        : 0
    }));

    // Customers added this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const addedThisMonth = activeCustomers.filter(c => 
      new Date(c.dateAdded) >= firstDayOfMonth
    ).length;

    // Total follow-ups set
    const withFollowUps = activeCustomers.filter(c => c.followUpDate).length;

    // Demo completion rate
    const totalDemos = activeCustomers.length * 5; // 5 demos per customer
    let completedDemos = 0;
    activeCustomers.forEach(customer => {
      if (customer.demos) {
        completedDemos += Object.values(customer.demos).filter(d => d.completed).length;
      }
    });
    const demoCompletionRate = totalDemos > 0 
      ? Math.round((completedDemos / totalDemos) * 100) 
      : 0;

    // Purchase stats
    const currentDate = new Date();
    const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let totalSalesThisMonth = 0;
    let totalSalesAllTime = 0;
    
    activeCustomers.forEach(customer => {
      if (customer.purchases) {
        customer.purchases.forEach(purchase => {
          totalSalesAllTime += purchase.total;
          if (new Date(purchase.date) >= firstDayOfCurrentMonth) {
            totalSalesThisMonth += purchase.total;
          }
        });
      }
    });

    return {
      stateStats,
      stageStats,
      addedThisMonth,
      withFollowUps,
      demoCompletionRate,
      totalActive: activeCustomers.length,
      totalSalesThisMonth,
      totalSalesAllTime
    };
  };

  const stats = calculateStats();

  // Handle clicking on stats to filter
  const handleStatClick = (filterType, filterValue) => {
    // Scroll to customer list
    const customerList = document.querySelector('.customer-list');
    if (customerList) {
      customerList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Apply filter based on what was clicked
    switch(filterType) {
      case 'stage':
        setFilterStage(filterValue);
        setActiveFilter({ type: 'stage', value: filterValue });
        break;
      case 'state':
        // We'll need to add state filter - for now, just search by state
        setSearchTerm(filterValue);
        setActiveFilter({ type: 'state', value: filterValue });
        break;
      case 'recent':
        // Sort by newest and filter to this month
        setSortBy('date-newest');
        setActiveFilter({ type: 'recent', value: 'This Month' });
        break;
      case 'followup':
        // Show only customers with follow-ups
        setActiveFilter({ type: 'followup', value: 'Has Follow-up' });
        break;
      case 'all':
        setFilterStage('All');
        setSearchTerm('');
        setActiveFilter(null);
        break;
      default:
        break;
    }
  };

  // Clear active filter
  const clearFilter = () => {
    setFilterStage('All');
    setSearchTerm('');
    setActiveFilter(null);
  };

  const deletePurchase = (purchaseId) => {
    if (!window.confirm('Delete this purchase?')) return;

    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          purchases: (c.purchases || []).filter(p => p.id !== purchaseId)
        };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    setSelectedCustomer(updatedCustomers.find(c => c.id === selectedCustomer.id));
  };

  // Export customers to JSON file
  const handleExportCustomers = () => {
    const dataStr = JSON.stringify(customers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `primrose-customers-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert(`✅ Exported ${customers.length} customers!\n\nFile saved to your Downloads folder.`);
  };

  // Import customers from JSON file
  const handleImportCustomers = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (!Array.isArray(importedData)) {
          alert('❌ Invalid file format. Must be a JSON array of customers.');
          return;
        }

        const confirmMessage = `Found ${importedData.length} customers in backup file.\n\n` +
          `Current customers: ${customers.length}\n` +
          `Import method:\n\n` +
          `OK = MERGE (add to existing customers)\n` +
          `Cancel = REPLACE (delete all and import)\n\n` +
          `What would you like to do?`;

        const shouldMerge = window.confirm(confirmMessage);
        
        if (shouldMerge) {
          // Merge - add imported customers to existing
          const mergedCustomers = [...customers, ...importedData];
          setCustomers(mergedCustomers);
          alert(`✅ Imported ${importedData.length} customers!\n\nTotal customers now: ${mergedCustomers.length}`);
        } else {
          // User clicked Cancel - ask for confirmation to replace
          const confirmReplace = window.confirm(
            `⚠️ WARNING: This will DELETE all ${customers.length} existing customers and replace with ${importedData.length} from backup.\n\nAre you SURE?`
          );
          if (confirmReplace) {
            setCustomers(importedData);
            alert(`✅ Replaced all data with backup!\n\nTotal customers: ${importedData.length}`);
          }
        }
      } catch (error) {
        alert('❌ Error reading file. Make sure it\'s a valid Primrose CRM backup file.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input so same file can be imported again if needed
    event.target.value = '';
  };

  return (
    <div className="customer-manager">
      <header className="header">
        <h1>🎯 Primrose CRM</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{customers.filter(c => c.active).length}</span>
            <span className="stat-label">Active Customers</span>
          </div>
          <div className="stat">
            <span className="stat-value">{customers.filter(c => c.leadStage === 'Hot').length}</span>
            <span className="stat-label">Hot Leads</span>
          </div>
          <button 
            className="btn btn-primary header-route-btn"
            onClick={() => setShowRoutePlanner(!showRoutePlanner)}
          >
            {showRoutePlanner ? '👥 Customers' : '🗺️ Route Planner'}
          </button>
        </div>
      </header>

      {showRoutePlanner ? (
        <RoutePlanner 
          customers={customers} 
          onBack={() => setShowRoutePlanner(false)}
        />
      ) : (
        <>
      {!selectedCustomer && !showForm && (
        <>
          {/* Follow-Up Alerts Dashboard */}
          {(followUpAlerts.overdue.length > 0 || followUpAlerts.thisWeek.length > 0 || followUpAlerts.nextWeek.length > 0) && (
            <div className="followup-dashboard">
              {/* Overdue */}
              {followUpAlerts.overdue.length > 0 && (
                <div className="followup-alert alert-overdue">
                  <div className="alert-header">
                    <span className="alert-icon">⚠️</span>
                    <h3>{followUpAlerts.overdue.length} FOLLOW-UP{followUpAlerts.overdue.length !== 1 ? 'S' : ''} OVERDUE</h3>
                  </div>
                  <div className="alert-list">
                    {followUpAlerts.overdue.slice(0, 5).map(customer => (
                      <div 
                        key={customer.id} 
                        className="alert-item"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <span className="alert-customer-name">{customer.name}</span>
                        <span className="alert-time">
                          {Math.abs(customer.daysUntil)} day{Math.abs(customer.daysUntil) !== 1 ? 's' : ''} overdue
                        </span>
                      </div>
                    ))}
                    {followUpAlerts.overdue.length > 5 && (
                      <div className="alert-more">
                        + {followUpAlerts.overdue.length - 5} more overdue
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* This Week */}
              {followUpAlerts.thisWeek.length > 0 && (
                <div className="followup-alert alert-thisweek">
                  <div className="alert-header">
                    <span className="alert-icon">📅</span>
                    <h3>{followUpAlerts.thisWeek.length} DUE THIS WEEK</h3>
                  </div>
                  <div className="alert-list">
                    {followUpAlerts.thisWeek.slice(0, 5).map(customer => (
                      <div 
                        key={customer.id} 
                        className="alert-item"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <span className="alert-customer-name">{customer.name}</span>
                        <span className="alert-time">
                          {customer.daysUntil === 0 ? 'Today' : 
                           customer.daysUntil === 1 ? 'Tomorrow' : 
                           `in ${customer.daysUntil} days`}
                        </span>
                      </div>
                    ))}
                    {followUpAlerts.thisWeek.length > 5 && (
                      <div className="alert-more">
                        + {followUpAlerts.thisWeek.length - 5} more this week
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Next Week */}
              {followUpAlerts.nextWeek.length > 0 && (
                <div className="followup-alert alert-nextweek">
                  <div className="alert-header">
                    <span className="alert-icon">📆</span>
                    <h3>{followUpAlerts.nextWeek.length} DUE NEXT WEEK</h3>
                  </div>
                  <div className="alert-list">
                    {followUpAlerts.nextWeek.slice(0, 3).map(customer => (
                      <div 
                        key={customer.id} 
                        className="alert-item"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <span className="alert-customer-name">{customer.name}</span>
                        <span className="alert-time">in {customer.daysUntil} days</span>
                      </div>
                    ))}
                    {followUpAlerts.nextWeek.length > 3 && (
                      <div className="alert-more">
                        + {followUpAlerts.nextWeek.length - 3} more next week
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery Alerts Dashboard */}
          {(deliveryAlerts.overdue.length > 0 || deliveryAlerts.thisWeek.length > 0 || deliveryAlerts.upcoming.length > 0) && (
            <div className="delivery-dashboard">
              {/* Overdue Deliveries */}
              {deliveryAlerts.overdue.length > 0 && (
                <div className="delivery-alert alert-overdue">
                  <div className="alert-header">
                    <span className="alert-icon">🚨</span>
                    <h3>{deliveryAlerts.overdue.length} DELIVER{deliveryAlerts.overdue.length !== 1 ? 'IES' : 'Y'} OVERDUE</h3>
                  </div>
                  <div className="alert-list">
                    {deliveryAlerts.overdue.slice(0, 5).map(customer => (
                      <div 
                        key={customer.id} 
                        className="alert-item"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <span className="alert-customer-name">{customer.name}</span>
                        <span className="alert-time">
                          {Math.abs(customer.daysUntil)} day{Math.abs(customer.daysUntil) !== 1 ? 's' : ''} overdue
                        </span>
                      </div>
                    ))}
                    {deliveryAlerts.overdue.length > 5 && (
                      <div className="alert-more">
                        + {deliveryAlerts.overdue.length - 5} more overdue
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* This Week Deliveries */}
              {deliveryAlerts.thisWeek.length > 0 && (
                <div className="delivery-alert alert-thisweek">
                  <div className="alert-header">
                    <span className="alert-icon">📦</span>
                    <h3>{deliveryAlerts.thisWeek.length} DELIVER{deliveryAlerts.thisWeek.length !== 1 ? 'IES' : 'Y'} THIS WEEK</h3>
                  </div>
                  <div className="alert-list">
                    {deliveryAlerts.thisWeek.slice(0, 5).map(customer => (
                      <div 
                        key={customer.id} 
                        className="alert-item"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <span className="alert-customer-name">{customer.name}</span>
                        <span className="alert-time">
                          {customer.daysUntil === 0 ? 'Today' : 
                           customer.daysUntil === 1 ? 'Tomorrow' : 
                           `in ${customer.daysUntil} days`}
                        </span>
                      </div>
                    ))}
                    {deliveryAlerts.thisWeek.length > 5 && (
                      <div className="alert-more">
                        + {deliveryAlerts.thisWeek.length - 5} more this week
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upcoming Deliveries */}
              {deliveryAlerts.upcoming.length > 0 && deliveryAlerts.upcoming.length <= 3 && (
                <div className="delivery-alert alert-upcoming">
                  <div className="alert-header">
                    <span className="alert-icon">📅</span>
                    <h3>{deliveryAlerts.upcoming.length} UPCOMING DELIVER{deliveryAlerts.upcoming.length !== 1 ? 'IES' : 'Y'}</h3>
                  </div>
                  <div className="alert-list">
                    {deliveryAlerts.upcoming.map(customer => (
                      <div 
                        key={customer.id} 
                        className="alert-item"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <span className="alert-customer-name">{customer.name}</span>
                        <span className="alert-time">
                          {customer.daysUntil === null ? 'No date set' : `in ${customer.daysUntil} days`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats Dashboard */}
          {activeCustomers.length > 0 && (
            <div className="stats-dashboard">
              <h2 className="stats-title">📊 Quick Stats</h2>
              
              <div className="stats-grid">
                {/* Quick Metrics */}
                <div className="stat-card metric-card">
                  <div className="metric-group">
                    <div 
                      className="metric-item clickable" 
                      onClick={() => handleStatClick('all')}
                      title="Click to show all customers"
                    >
                      <div className="metric-value">{stats.totalActive}</div>
                      <div className="metric-label">Active Customers</div>
                    </div>
                    <div 
                      className="metric-item clickable" 
                      onClick={() => handleStatClick('recent')}
                      title="Click to show recently added customers"
                    >
                      <div className="metric-value">{stats.addedThisMonth}</div>
                      <div className="metric-label">Added This Month</div>
                    </div>
                  </div>
                  <div className="metric-group">
                    <div 
                      className="metric-item clickable" 
                      onClick={() => handleStatClick('followup')}
                      title="Click to show customers with follow-ups"
                    >
                      <div className="metric-value">{stats.withFollowUps}</div>
                      <div className="metric-label">With Follow-ups</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value">{stats.demoCompletionRate}%</div>
                      <div className="metric-label">Demo Completion</div>
                    </div>
                  </div>
                  <div className="metric-group metric-group-sales">
                    <div className="metric-item">
                      <div className="metric-value metric-value-currency">${stats.totalSalesThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      <div className="metric-label">Sales This Month</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value metric-value-currency">${stats.totalSalesAllTime.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      <div className="metric-label">Total Sales</div>
                    </div>
                  </div>
                </div>

                {/* Customers by Lead Stage */}
                <div className="stat-card">
                  <h3 className="stat-card-title">🎯 By Lead Stage</h3>
                  <div className="stage-stats">
                    {stats.stageStats.map(({ stage, count, percentage }) => (
                      <div 
                        key={stage} 
                        className="stage-stat-item clickable"
                        onClick={() => handleStatClick('stage', stage)}
                        title={`Click to show ${stage} customers`}
                      >
                        <div className="stage-stat-header">
                          <span className="stage-stat-name">
                            <span className={`stage-dot stage-${stage.toLowerCase()}`}></span>
                            {stage}
                          </span>
                          <span className="stage-stat-count">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="stage-stat-bar">
                          <div 
                            className={`stage-stat-fill stage-${stage.toLowerCase()}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customers by State */}
                <div className="stat-card">
                  <h3 className="stat-card-title">📍 By State</h3>
                  <div className="state-stats">
                    {stats.stateStats.slice(0, 8).map(({ state, count }) => {
                      const maxCount = stats.stateStats[0]?.count || 1;
                      const percentage = Math.round((count / maxCount) * 100);
                      return (
                        <div 
                          key={state} 
                          className="state-stat-item clickable"
                          onClick={() => handleStatClick('state', state)}
                          title={`Click to show ${state} customers`}
                        >
                          <div className="state-stat-header">
                            <span className="state-stat-name">{state}</span>
                            <span className="state-stat-count">{count}</span>
                          </div>
                          <div className="state-stat-bar">
                            <div 
                              className="state-stat-fill"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    {stats.stateStats.length > 8 && (
                      <div className="state-stat-more">
                        + {stats.stateStats.length - 8} more states
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Reminder */}
          {customers.length > 0 && (
            <div className="backup-reminder">
              <div className="backup-reminder-icon">💾</div>
              <div className="backup-reminder-text">
                <strong>Protect Your Data!</strong>
                <span>
                  {customers.length} customer{customers.length !== 1 ? 's' : ''} in system. 
                  Export backup regularly - your data is stored in this browser.
                </span>
              </div>
              <button className="btn btn-success btn-small" onClick={handleExportCustomers}>
                Export Now
              </button>
            </div>
          )}

          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Add Customer
            </button>

            <div className="backup-buttons">
              <button className="btn btn-success btn-backup" onClick={handleExportCustomers}>
                💾 Export Backup
              </button>
              <label className="btn btn-secondary btn-backup">
                📥 Import Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportCustomers}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search anywhere: name, phone, email, notes, contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select 
              className="filter-select"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
            >
              <option value="All">All Stages</option>
              {leadStages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>

            <select 
              className="filter-select sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">📝 Name (A-Z)</option>
              <option value="name-desc">📝 Name (Z-A)</option>
              <option value="date-newest">📅 Newest First</option>
              <option value="date-oldest">📅 Oldest First</option>
              <option value="followup-soonest">⏰ Follow-up (Soonest)</option>
              <option value="stage-priority">🔥 Stage (Hot First)</option>
              <option value="city-asc">🏙️ City (A-Z)</option>
              <option value="state-asc">📍 State (A-Z)</option>
            </select>
          </div>

          <div className="customer-list">
            {activeFilter && (
              <div className="active-filter-banner">
                <span className="active-filter-text">
                  📌 Filtered: {activeFilter.value}
                </span>
                <button 
                  className="btn-clear-filter" 
                  onClick={clearFilter}
                  title="Clear filter"
                >
                  ✕ Show All
                </button>
              </div>
            )}

            {searchTerm && (
              <div className="search-results-banner">
                <span className="search-results-text">
                  🔍 Found {filteredCustomers.filter(c => c.active).length} customer{filteredCustomers.filter(c => c.active).length !== 1 ? 's' : ''} matching "{searchTerm}"
                </span>
                <button 
                  className="btn-clear-search" 
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕ Clear
                </button>
              </div>
            )}

            <h2>Active Customers ({activeCustomers.length})</h2>
            {activeCustomers.length === 0 && (
              <p className="empty-state">No customers yet. Click "Add Customer" to get started!</p>
            )}
            {activeCustomers.map(customer => (
              <div key={customer.id} className="customer-card">
                <div className="customer-card-main" onClick={() => setSelectedCustomer(customer)}>
                  <div className="customer-card-header">
                    <h3>{customer.name}</h3>
                    <span className={`badge badge-${customer.leadStage.toLowerCase()}`}>
                      {customer.leadStage}
                    </span>
                  </div>
                  <p className="customer-company">{customer.company}</p>
                  <p className="customer-location">📍 {customer.city}, {customer.state}</p>
                  
                  {/* Demo Badges */}
                  {customer.demos && Object.values(customer.demos).some(d => d.completed) && (
                    <div className="demo-badges">
                      {Object.entries(customer.demos).map(([demoType, demo]) => 
                        demo.completed && (
                          <span key={demoType} className="demo-badge">
                            {demoType} ✓
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {customer.followUpDate && (
                    <p className="customer-followup">📅 Follow-up: {new Date(customer.followUpDate).toLocaleDateString()}</p>
                  )}

                  {/* Purchase Summary */}
                  {customer.purchases && customer.purchases.length > 0 && (
                    <div className="purchase-summary">
                      <span className="purchase-badge">
                        💰 ${customer.purchases.reduce((sum, p) => sum + p.total, 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                      <span className="purchase-count">
                        {customer.purchases.length} {customer.purchases.length === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="customer-quick-actions">
                  {customer.contacts && customer.contacts[0]?.phone && (
                    <a 
                      href={`tel:${customer.contacts[0].phone}`}
                      className="quick-action-btn call-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Call"
                    >
                      📞
                    </a>
                  )}
                  {customer.contacts && customer.contacts[0]?.email && (
                    <a 
                      href={`mailto:${customer.contacts[0].email}`}
                      className="quick-action-btn email-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Email"
                    >
                      ✉️
                    </a>
                  )}
                  {customer.address && customer.city && customer.state && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${customer.address}, ${customer.city}, ${customer.state} ${customer.zip || ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-action-btn nav-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Navigate"
                    >
                      🗺️
                    </a>
                  )}
                </div>
              </div>
            ))}

            {inactiveCustomers.length > 0 && (
              <>
                <h2 style={{marginTop: '2rem'}}>Inactive Customers ({inactiveCustomers.length})</h2>
                {inactiveCustomers.map(customer => (
                  <div key={customer.id} className="customer-card inactive" onClick={() => setSelectedCustomer(customer)}>
                    <div className="customer-card-header">
                      <h3>{customer.name}</h3>
                      <span className="badge badge-inactive">Inactive</span>
                    </div>
                    <p className="customer-company">{customer.company}</p>
                    <p className="customer-reason">Reason: {customer.inactiveReason}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          leadStages={leadStages}
          states={states}
          demoTypes={demoTypes}
          onSave={handleSaveCustomer}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {selectedCustomer && (
        <CustomerDetail
          customer={selectedCustomer}
          demoTypes={demoTypes}
          onClose={() => setSelectedCustomer(null)}
          onEdit={(customer) => {
            setEditingCustomer(customer);
            setShowForm(true);
            setSelectedCustomer(null);
          }}
          onDelete={handleDeleteCustomer}
          onToggleActive={handleToggleActive}
          onUpdate={(updatedCustomer) => {
            setCustomers(customers.map(c => 
              c.id === updatedCustomer.id ? updatedCustomer : c
            ));
            setSelectedCustomer(updatedCustomer);
          }}
        />
      )}
        </>
      )}
    </div>
  );
};

// Customer Form Component
const CustomerForm = ({ customer, leadStages, states, demoTypes, onSave, onCancel }) => {
  const [formData, setFormData] = useState(customer || {
    name: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    primaryPhone: '',
    email: '',
    leadStage: 'Lead',
    referralSource: '',
    followUpDate: '',
    orderPendingDelivery: false,
    expectedDeliveryDate: '',
    contacts: [{
      name: '',
      title: '',
      phone: '',
      email: '',
      bestTime: '',
      isPrimary: true
    }],
    demos: {
      'Phaser': { completed: false, date: '' },
      'Grease': { completed: false, date: '' },
      'Engine Oil': { completed: false, date: '' },
      'Hydraulic Fluid': { completed: false, date: '' },
      'Gear Oil': { completed: false, date: '' }
    },
    notes: []
  });

  // Business card scanning state
  const [isScanning, setIsScanning] = useState(false);

  // Phone number formatting function
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  // Business Card Scanner Function
  const scanBusinessCard = async (imageFile) => {
    setIsScanning(true);

    try {
      // Convert image to base64
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Remove data:image/...;base64, prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Determine image type
      const imageType = imageFile.type; // e.g., "image/jpeg" or "image/png"

      // Call Netlify Function (secure backend proxy)
      const response = await fetch('/.netlify/functions/scan-business-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Image,
          imageType: imageType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      const extractedData = result.data;

      // Auto-fill the form with extracted data
      setFormData({
        ...formData,
        name: extractedData.name || formData.name,
        company: extractedData.company || formData.company,
        address: extractedData.address || formData.address,
        city: extractedData.city || formData.city,
        state: extractedData.state || formData.state,
        zip: extractedData.zip || formData.zip,
        contacts: [{
          ...formData.contacts[0],
          name: extractedData.name || formData.contacts[0].name,
          title: extractedData.title || formData.contacts[0].title,
          phone: extractedData.phone || formData.contacts[0].phone,
          email: extractedData.email || formData.contacts[0].email
        }]
      });

      alert('✅ Business card scanned successfully! Please review the information.');

    } catch (error) {
      console.error('Business card scan error:', error);
      alert(`❌ Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle file input for business card
  const handleBusinessCardUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      scanBusinessCard(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleChange = (field, value) => {
    // Auto-fill Primary Contact name from Customer Name
    if (field === 'name' && value.trim()) {
      const newContacts = [...formData.contacts];
      newContacts[0] = { ...newContacts[0], name: value };
      setFormData({ 
        ...formData, 
        [field]: value,
        contacts: newContacts
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleContactChange = (index, field, value) => {
    const newContacts = [...formData.contacts];
    
    // Format phone number as user types
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({ ...formData, contacts: newContacts });
  };

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: '', title: '', phone: '', email: '', bestTime: '', isPrimary: false }]
    });
  };

  const removeContact = (index) => {
    if (formData.contacts.length === 1) {
      alert('Must have at least one contact!');
      return;
    }
    const newContacts = formData.contacts.filter((_, i) => i !== index);
    setFormData({ ...formData, contacts: newContacts });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.state) {
      alert('Please fill in required fields: Name, City, State');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!customer && (
            <>
              <input
                type="file"
                id="business-card-upload"
                accept="image/*"
                capture="environment"
                onChange={handleBusinessCardUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-success btn-small"
                onClick={() => document.getElementById('business-card-upload').click()}
                disabled={isScanning}
              >
                {isScanning ? '⏳ Scanning...' : '📸 Scan Card'}
              </button>
            </>
          )}
          <button className="btn-close" onClick={onCancel}>×</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-row">
            <div className="form-field">
              <label>Customer Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Company Name</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div className="form-row city-state-zip">
            <div className="form-field">
              <label>City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>State *</label>
              <select
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                required
              >
                <option value="">Select State</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>ZIP Code</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => handleChange('zip', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Primary Contact</h3>
          {formData.contacts.map((contact, index) => (
            <div key={index} className="contact-section">
              {index === 0 && <p className="contact-label">Primary Contact</p>}
              {index > 0 && (
                <div className="contact-header">
                  <p className="contact-label">Additional Contact #{index}</p>
                  <button type="button" className="btn-remove" onClick={() => removeContact(index)}>Remove</button>
                </div>
              )}
              
              <div className="form-row">
                <div className="form-field">
                  <label>Name {index === 0 && '*'}</label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                    required={index === 0}
                  />
                </div>
                <div className="form-field">
                  <label>Title/Role</label>
                  <input
                    type="text"
                    value={contact.title}
                    onChange={(e) => handleContactChange(index, 'title', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Phone {index === 0 && '*'}</label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                    placeholder="(605) 555-1234"
                    maxLength="14"
                    required={index === 0}
                  />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Best Time to Contact</label>
                <input
                  type="text"
                  value={contact.bestTime}
                  onChange={(e) => handleContactChange(index, 'bestTime', e.target.value)}
                  placeholder="e.g., Mornings, After 2pm, Weekdays only"
                />
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-secondary" onClick={addContact}>
            + Add Another Contact
          </button>
        </div>

        <div className="form-section">
          <h3>Sales Information</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Lead Stage *</label>
              <select
                value={formData.leadStage}
                onChange={(e) => handleChange('leadStage', e.target.value)}
                required
              >
                {leadStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Referral Source</label>
              <input
                type="text"
                value={formData.referralSource}
                onChange={(e) => handleChange('referralSource', e.target.value)}
                placeholder="e.g., Farm Show, Referral from..."
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {customer ? 'Update Customer' : 'Add Customer'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Customer Detail Component
const CustomerDetail = ({ customer, demoTypes, onClose, onEdit, onDelete, onToggleActive, onUpdate }) => {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedContact, setSelectedContact] = useState(customer.contacts[0]?.name || '');
  const [filterContact, setFilterContact] = useState('All');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  
  // Task completion states
  const [showCompleteFollowup, setShowCompleteFollowup] = useState(false);
  const [showCompleteDelivery, setShowCompleteDelivery] = useState(false);
  const [followupNote, setFollowupNote] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [selectedPurchaseForDelivery, setSelectedPurchaseForDelivery] = useState(null);
  
  // Quick Order states
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [orderProducts, setOrderProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [currentUnitPrice, setCurrentUnitPrice] = useState('');
  const [orderCWO, setOrderCWO] = useState(false);
  const [orderPendingDelivery, setOrderPendingDelivery] = useState(false);
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Quick action states
  const [showChangeFollowupDate, setShowChangeFollowupDate] = useState(false);
  const [newFollowupDate, setNewFollowupDate] = useState('');
  const [showMarkDeliveryPending, setShowMarkDeliveryPending] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [showChangeDeliveryDate, setShowChangeDeliveryDate] = useState(false);
  
  // Demo editing states
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [demoDate, setDemoDate] = useState('');
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Initialize speech recognition
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        // Append to existing note text
        if (transcript) {
          setNoteText(prev => {
            // If previous text exists and doesn't end with space, add one
            const needsSpace = prev && !prev.endsWith(' ') && !prev.endsWith('\n');
            return prev + (needsSpace ? ' ' : '') + transcript;
          });
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
      setVoiceSupported(true);
    } else {
      setVoiceSupported(false);
    }
  }, []);

  // Voice recording handlers
  const startVoiceRecording = () => {
    if (recognition && !isRecording) {
      setIsRecording(true);
      recognition.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Product list for purchases
  const productList = [
    // Fuel Additives - 5000 Series
    '5007 Power Klenz ID',
    '5055 Rescue Rx',
    '5437 Winter Klenz ID',
    '5757 Winter Klenz ID',
    // Popular Products
    'Phaser',
    '480M',
    'Seal Saver',
    '2035 Thermal Advantage',
    // Additional Fuel Additives
    '532T',
    'B66R',
    '203M',
    '205R',
    '208M',
    '210M',
    '210V',
    '211M',
    '212A',
    '212M',
    '213R',
    '217M',
    '252R',
    '327C',
    '400P',
    '510M',
    '512M',
    '513M',
    '514M',
    '514S',
    '548A',
    'B620',
    'B660',
    'B680',
    '714M',
    '747S',
    'MP8',
    // Lubricants
    'Grease',
    'Engine Oil',
    'Hydraulic Fluid',
    'Gear Oil',
    // Other
    'Custom'
  ];

  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    product: '',
    customProduct: '',
    quantity: '',
    unitPrice: '',
    total: '',
    cwo: false,
    notes: ''
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    
    if (editingNote) {
      // Update existing note
      const updatedNotes = (customer.notes || []).map(note =>
        note.id === editingNote.id
          ? { ...note, text: noteText, contactName: selectedContact }
          : note
      );
      
      const updatedCustomer = {
        ...customer,
        notes: updatedNotes
      };
      
      onUpdate(updatedCustomer);
      setEditingNote(null);
    } else {
      // Add new note
      const newNote = {
        id: Date.now(),
        contactName: selectedContact,
        text: noteText,
        date: new Date().toISOString(),
        addedBy: 'Andy' // In future, this would be current user
      };

      const updatedCustomer = {
        ...customer,
        notes: [newNote, ...(customer.notes || [])]
      };

      onUpdate(updatedCustomer);
    }
    
    setNoteText('');
    setShowNoteForm(false);
  };

  const editNote = (note) => {
    setEditingNote(note);
    setNoteText(note.text);
    setSelectedContact(note.contactName);
    setShowNoteForm(true);
  };

  const deleteNote = (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    
    const updatedCustomer = {
      ...customer,
      notes: (customer.notes || []).filter(note => note.id !== noteId)
    };
    
    onUpdate(updatedCustomer);
  };

  const cancelNoteForm = () => {
    setShowNoteForm(false);
    setEditingNote(null);
    setNoteText('');
    setSelectedContact(customer.contacts[0]?.name || '');
  };

  const filteredNotes = (customer.notes || []).filter(note => 
    filterContact === 'All' || note.contactName === filterContact
  );

  // Task completion handlers
  const handleCompleteFollowup = () => {
    // Set suggested next follow-up date (3 months from today)
    const threeMonthsOut = new Date();
    threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
    const suggestedDate = threeMonthsOut.toISOString().split('T')[0];
    
    setNextFollowupDate(suggestedDate);
    setFollowupNote('');
    setShowCompleteFollowup(true);
  };

  const saveFollowupCompletion = () => {
    // Create note for follow-up completion
    const newFollowupNote = {
      id: Date.now(),
      contactName: customer.contacts[0]?.name || 'General',
      text: followupNote.trim() || 'Follow-up completed',
      date: new Date().toISOString(),
      addedBy: 'Andy',
      type: 'followup' // Tag to identify as follow-up note
    };

    const updatedCustomer = {
      ...customer,
      notes: [newFollowupNote, ...(customer.notes || [])],
      followUpDate: nextFollowupDate || null
    };

    onUpdate(updatedCustomer);
    setShowCompleteFollowup(false);
    setFollowupNote('');
  };

  const handleCompleteDelivery = () => {
    // Get pending purchases (with orderPendingDelivery flag)
    const pendingPurchases = (customer.purchases || []).filter(p => 
      p.date === customer.expectedDeliveryDate || !p.delivered
    );
    
    if (pendingPurchases.length === 0) {
      alert('No pending purchases found for this delivery date.');
      return;
    }
    
    setSelectedPurchaseForDelivery(pendingPurchases[0].id);
    setShowCompleteDelivery(true);
  };

  const saveDeliveryCompletion = () => {
    if (!selectedPurchaseForDelivery) {
      alert('Please select which purchase was delivered');
      return;
    }

    const purchase = customer.purchases.find(p => p.id === selectedPurchaseForDelivery);
    
    // Create note for delivery completion
    const deliveryNote = {
      id: Date.now(),
      contactName: customer.contacts[0]?.name || 'General',
      text: `Delivered: ${purchase.product} - Qty: ${purchase.quantity} - $${purchase.total}`,
      date: new Date().toISOString(),
      addedBy: 'Andy',
      type: 'delivery' // Tag to identify as delivery note
    };

    const updatedCustomer = {
      ...customer,
      notes: [deliveryNote, ...(customer.notes || [])],
      orderPendingDelivery: false,
      expectedDeliveryDate: null,
      purchases: customer.purchases.map(p => 
        p.id === selectedPurchaseForDelivery ? { ...p, delivered: true } : p
      )
    };

    onUpdate(updatedCustomer);
    setShowCompleteDelivery(false);
    setSelectedPurchaseForDelivery(null);
  };

  // Quick Order handlers
  const addProductToOrder = () => {
    if (!currentProduct || !currentQuantity || !currentUnitPrice) {
      alert('Please enter product, quantity, and unit price');
      return;
    }

    const quantity = parseFloat(currentQuantity);
    const unitPrice = parseFloat(currentUnitPrice);
    const total = (quantity * unitPrice).toFixed(2);

    const newProduct = {
      id: Date.now().toString(),
      product: currentProduct,
      quantity: quantity,
      unitPrice: unitPrice,
      total: parseFloat(total)
    };

    setOrderProducts([...orderProducts, newProduct]);
    
    // Clear form
    setCurrentProduct('');
    setCurrentQuantity('');
    setCurrentUnitPrice('');
  };

  const removeProductFromOrder = (productId) => {
    setOrderProducts(orderProducts.filter(p => p.id !== productId));
  };

  const calculateOrderTotal = () => {
    return orderProducts.reduce((sum, product) => sum + product.total, 0).toFixed(2);
  };

  const saveQuickOrder = () => {
    if (orderProducts.length === 0) {
      alert('Please add at least one product to the order');
      return;
    }

    if (orderPendingDelivery && !orderDeliveryDate) {
      alert('Please set an expected delivery date');
      return;
    }

    const newOrder = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      products: orderProducts,
      orderTotal: parseFloat(calculateOrderTotal()),
      cwo: orderCWO,
      pendingDelivery: orderPendingDelivery,
      expectedDeliveryDate: orderDeliveryDate || null,
      notes: orderNotes,
      delivered: false
    };

    const updatedCustomer = {
      ...customer,
      purchases: [newOrder, ...(customer.purchases || [])],
      orderPendingDelivery: orderPendingDelivery ? true : customer.orderPendingDelivery,
      expectedDeliveryDate: orderPendingDelivery ? orderDeliveryDate : customer.expectedDeliveryDate
    };

    onUpdate(updatedCustomer);
    
    // Reset form
    setShowQuickOrder(false);
    setOrderProducts([]);
    setCurrentProduct('');
    setCurrentQuantity('');
    setCurrentUnitPrice('');
    setOrderCWO(false);
    setOrderPendingDelivery(false);
    setOrderDeliveryDate('');
    setOrderNotes('');
  };

  const cancelQuickOrder = () => {
    setShowQuickOrder(false);
    setOrderProducts([]);
    setCurrentProduct('');
    setCurrentQuantity('');
    setCurrentUnitPrice('');
    setOrderCWO(false);
    setOrderPendingDelivery(false);
    setOrderDeliveryDate('');
    setOrderNotes('');
  };

  // Quick action handlers
  const handleLeadStageChange = (newStage) => {
    const updatedCustomer = {
      ...customer,
      leadStage: newStage
    };
    onUpdate(updatedCustomer);
  };

  const handleChangeFollowupDate = () => {
    setNewFollowupDate(customer.followUpDate || '');
    setShowChangeFollowupDate(true);
  };

  const saveNewFollowupDate = () => {
    if (!newFollowupDate) {
      alert('Please select a date');
      return;
    }

    const updatedCustomer = {
      ...customer,
      followUpDate: newFollowupDate
    };

    onUpdate(updatedCustomer);
    setShowChangeFollowupDate(false);
    setNewFollowupDate('');
  };

  const handleMarkDeliveryPending = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNewDeliveryDate(tomorrow.toISOString().split('T')[0]);
    setShowMarkDeliveryPending(true);
  };

  const saveDeliveryPending = () => {
    if (!newDeliveryDate) {
      alert('Please select an expected delivery date');
      return;
    }

    const updatedCustomer = {
      ...customer,
      orderPendingDelivery: true,
      expectedDeliveryDate: newDeliveryDate
    };

    onUpdate(updatedCustomer);
    setShowMarkDeliveryPending(false);
    setNewDeliveryDate('');
  };

  const handleChangeDeliveryDate = () => {
    setNewDeliveryDate(customer.expectedDeliveryDate || '');
    setShowChangeDeliveryDate(true);
  };

  const saveNewDeliveryDate = () => {
    if (!newDeliveryDate) {
      alert('Please select a date');
      return;
    }

    const updatedCustomer = {
      ...customer,
      expectedDeliveryDate: newDeliveryDate
    };

    onUpdate(updatedCustomer);
    setShowChangeDeliveryDate(false);
    setNewDeliveryDate('');
  };

  const handleCancelDelivery = () => {
    if (!window.confirm('Cancel pending delivery? This will remove the delivery status.')) return;

    const updatedCustomer = {
      ...customer,
      orderPendingDelivery: false,
      expectedDeliveryDate: null
    };

    onUpdate(updatedCustomer);
    setShowChangeDeliveryDate(false);
    setNewDeliveryDate('');
  };

  // Demo handlers
  const handleDemoClick = (demoType) => {
    setSelectedDemo(demoType);
    const demo = customer.demos[demoType];
    if (demo?.completed && demo?.date) {
      setDemoDate(demo.date);
    } else {
      setDemoDate(new Date().toISOString().split('T')[0]);
    }
    setShowDemoDialog(true);
  };

  const toggleDemoComplete = () => {
    if (!selectedDemo) return;

    const demo = customer.demos[selectedDemo];
    const updatedDemos = {
      ...customer.demos,
      [selectedDemo]: {
        completed: !demo?.completed,
        date: demo?.completed ? '' : (demoDate || new Date().toISOString().split('T')[0])
      }
    };

    const updatedCustomer = {
      ...customer,
      demos: updatedDemos
    };

    onUpdate(updatedCustomer);
    setShowDemoDialog(false);
    setSelectedDemo(null);
    setDemoDate('');
  };

  const saveDemoDate = () => {
    if (!selectedDemo || !demoDate) {
      alert('Please select a date');
      return;
    }

    const updatedDemos = {
      ...customer.demos,
      [selectedDemo]: {
        completed: true,
        date: demoDate
      }
    };

    const updatedCustomer = {
      ...customer,
      demos: updatedDemos
    };

    onUpdate(updatedCustomer);
    setShowDemoDialog(false);
    setSelectedDemo(null);
    setDemoDate('');
  };

  // Count completed demos
  const completedDemos = customer.demos 
    ? Object.values(customer.demos).filter(d => d.completed).length 
    : 0;

  return (
    <div className="customer-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={onClose}>← Back to List</button>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={() => onEdit(customer)}>
            ✏️ Edit
          </button>
          <button 
            className={`btn ${customer.active ? 'btn-warning' : 'btn-success'}`}
            onClick={() => onToggleActive(customer)}
          >
            {customer.active ? 'Mark Inactive' : 'Reactivate'}
          </button>
          <button className="btn btn-danger" onClick={() => onDelete(customer.id)}>
            🗑️ Delete
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h2>{customer.name}</h2>
          {customer.company && <p className="company-name">{customer.company}</p>}
          <span className={`badge badge-${customer.active ? customer.leadStage.toLowerCase() : 'inactive'}`}>
            {customer.active ? customer.leadStage : 'Inactive'}
          </span>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">📍 Address</span>
              <span className="info-value">
                {customer.address && `${customer.address}, `}
                {customer.city}, {customer.state} {customer.zip}
              </span>
            </div>
            
            {customer.referralSource && (
              <div className="info-item">
                <span className="info-label">🤝 Referral Source</span>
                <span className="info-value">{customer.referralSource}</span>
              </div>
            )}

            {/* DATE ADDED SECTION */}
            <div className="info-item">
              <span className="info-label">📆 Date Added</span>
              <span className="info-value">
                {new Date(customer.dateAdded).toLocaleDateString()}
              </span>
            </div>

            {/* LEAD STAGE QUICK SELECTOR */}
            <div className="task-section-compact stage-section">
              <div className="task-compact-content">
                <div className="task-compact-info">
                  <span className="task-compact-icon">🏷️</span>
                  <div>
                    <div className="task-compact-label">Lead Stage</div>
                    <div className="task-compact-date">{customer.leadStage}</div>
                  </div>
                </div>
                <select 
                  className="stage-selector"
                  value={customer.leadStage}
                  onChange={(e) => handleLeadStageChange(e.target.value)}
                >
                  <option value="Lead">Lead</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                  <option value="Customer">Customer</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* FOLLOW-UP SECTION - ENHANCED */}
            {customer.followUpDate ? (
              <div className="task-section-compact">
                <div className="task-compact-content-stacked">
                  <div className="task-compact-header">
                    <span className="task-compact-icon">📅</span>
                    <div>
                      <div className="task-compact-label">Next Follow-Up</div>
                      <div className="task-compact-date">
                        {new Date(customer.followUpDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="task-compact-actions-stacked">
                    <button 
                      className="btn btn-success btn-stacked"
                      onClick={handleCompleteFollowup}
                    >
                      ✓ Complete
                    </button>
                    <button 
                      className="btn btn-secondary btn-stacked"
                      onClick={handleChangeFollowupDate}
                    >
                      Change Date
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="task-section-compact">
                <div className="task-compact-content-stacked">
                  <div className="task-compact-header">
                    <span className="task-compact-icon">📅</span>
                    <div>
                      <div className="task-compact-label">Next Follow-Up</div>
                      <div className="task-compact-empty">No follow-up scheduled</div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary btn-stacked"
                    onClick={handleChangeFollowupDate}
                  >
                    Set Date
                  </button>
                </div>
              </div>
            )}

            {/* DELIVERY SECTION - ENHANCED */}
            {customer.orderPendingDelivery ? (
              <div className="task-section-compact delivery">
                <div className="task-compact-content-stacked">
                  <div className="task-compact-header">
                    <span className="task-compact-icon">📦</span>
                    <div>
                      <div className="task-compact-label">Order Pending Delivery</div>
                      {customer.expectedDeliveryDate && (
                        <div className="task-compact-date">
                          Due: {new Date(customer.expectedDeliveryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="task-compact-actions-stacked">
                    <button 
                      className="btn btn-success btn-stacked"
                      onClick={handleCompleteDelivery}
                    >
                      ✓ Delivered
                    </button>
                    <button 
                      className="btn btn-secondary btn-stacked"
                      onClick={handleChangeDeliveryDate}
                    >
                      Change Date
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="task-section-compact">
                <div className="task-compact-content-stacked">
                  <div className="task-compact-header">
                    <span className="task-compact-icon">📦</span>
                    <div>
                      <div className="task-compact-label">Delivery Status</div>
                      <div className="task-compact-empty">No pending delivery</div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary btn-stacked"
                    onClick={handleMarkDeliveryPending}
                  >
                    + Add Delivery
                  </button>
                </div>
              </div>
            )}

            {/* QUICK ORDER SECTION */}
            <div className="task-section-compact order-section">
              <div className="task-compact-content">
                <div className="task-compact-info">
                  <span className="task-compact-icon">💰</span>
                  <div>
                    <div className="task-compact-label">Add New Order</div>
                  </div>
                </div>
                <button 
                  className="btn btn-primary btn-compact"
                  onClick={() => setShowQuickOrder(true)}
                >
                  + Add Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DEMO TRACKING SECTION IN DETAIL VIEW */}
        {customer.demos && (
          <div className="detail-section">
            <h3>Product Demos ({completedDemos} of {demoTypes.length} completed)</h3>
            <div className="demo-progress">
              <div className="demo-progress-bar">
                <div 
                  className="demo-progress-fill" 
                  style={{width: `${(completedDemos / demoTypes.length) * 100}%`}}
                ></div>
              </div>
            </div>
            
            <div className="demo-list">
              {demoTypes.map(demoType => (
                <div 
                  key={demoType} 
                  className={`demo-status ${customer.demos[demoType]?.completed ? 'completed' : 'pending'} clickable`}
                  onClick={() => handleDemoClick(demoType)}
                >
                  <div className="demo-status-icon">
                    {customer.demos[demoType]?.completed ? '✅' : '⭕'}
                  </div>
                  <div className="demo-status-info">
                    <div className="demo-status-name">{demoType}</div>
                    {customer.demos[demoType]?.completed && customer.demos[demoType]?.date && (
                      <div className="demo-status-date">
                        Completed: {new Date(customer.demos[demoType].date).toLocaleDateString()}
                      </div>
                    )}
                    {customer.demos[demoType]?.completed && !customer.demos[demoType]?.date && (
                      <div className="demo-status-date">Completed (date not recorded)</div>
                    )}
                    {!customer.demos[demoType]?.completed && (
                      <div className="demo-status-pending">Click to mark complete</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PURCHASE HISTORY SECTION */}
        {!showPurchaseForm && (
          <div className="detail-section">
            <h3>💰 Purchase History</h3>

            {customer.purchases && customer.purchases.length > 0 ? (
              <>
                <div className="purchase-stats">
                  <div className="purchase-stat">
                    <span className="purchase-stat-label">Total Spent:</span>
                    <span className="purchase-stat-value">
                      ${customer.purchases.reduce((sum, p) => sum + (p.orderTotal || p.total), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="purchase-stat">
                    <span className="purchase-stat-label">Total Orders:</span>
                    <span className="purchase-stat-value">{customer.purchases.length}</span>
                  </div>
                  <div className="purchase-stat">
                    <span className="purchase-stat-label">Last Purchase:</span>
                    <span className="purchase-stat-value">
                      {new Date(Math.max(...customer.purchases.map(p => new Date(p.date)))).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="purchase-stat">
                    <span className="purchase-stat-label">CWO Orders:</span>
                    <span className="purchase-stat-value">
                      {customer.purchases.filter(p => p.cwo).length}
                    </span>
                  </div>
                </div>

                <div className="purchases-list">
                  {[...customer.purchases]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(purchase => (
                      <div key={purchase.id} className="purchase-item">
                        <div className="purchase-item-main">
                          <div className="purchase-item-header">
                            <h4>
                              {purchase.products ? (
                                `Order - ${purchase.products.length} product${purchase.products.length > 1 ? 's' : ''}`
                              ) : (
                                purchase.product
                              )}
                            </h4>
                            <div className="purchase-item-badges">
                              {purchase.cwo && (
                                <span className="cwo-badge" title="Check With Order - 10% bonus">CWO</span>
                              )}
                              <span className="purchase-total">
                                ${(purchase.orderTotal || purchase.total).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </span>
                            </div>
                          </div>
                          
                          {/* Multi-product order display */}
                          {purchase.products ? (
                            <div className="purchase-products-list">
                              {purchase.products.map((prod, idx) => (
                                <div key={idx} className="purchase-product-line">
                                  <span className="product-qty">{prod.quantity}</span> × 
                                  <span className="product-name">{prod.product}</span> @ 
                                  <span className="product-price">${prod.unitPrice.toFixed(2)}</span> = 
                                  <span className="product-total">${prod.total.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Single product display (legacy) */
                            <div className="purchase-item-details">
                              <span>📦 Qty: {purchase.quantity}</span>
                              <span>💵 ${purchase.unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} each</span>
                            </div>
                          )}
                          
                          <div className="purchase-item-footer">
                            <span>📅 {new Date(purchase.date).toLocaleDateString()}</span>
                            <button 
                              className="btn btn-sm btn-danger-outline"
                              onClick={() => deletePurchase(purchase.id)}
                              title="Cancel this order"
                            >
                              🗑️ Cancel Order
                            </button>
                          </div>
                          
                          {purchase.notes && (
                            <p className="purchase-notes">📝 {purchase.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="empty-state">No purchases recorded yet. Click "+ Add Order" above to track sales.</p>
            )}
          </div>
        )}

        {/* PURCHASE FORM */}
        {showPurchaseForm && (
          <div className="detail-section purchase-form-section">
            <div className="section-header">
              <h3>{editingPurchase ? '✏️ Edit Purchase' : '+ Add Purchase'}</h3>
              <button className="btn-close" onClick={cancelPurchaseForm}>×</button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => handlePurchaseFormChange('date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Product *</label>
                <select
                  value={purchaseForm.product}
                  onChange={(e) => handlePurchaseFormChange('product', e.target.value)}
                >
                  <option value="">Select Product</option>
                  {productList.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>

              {purchaseForm.product === 'Custom' && (
                <div className="form-group form-group-full">
                  <label>Custom Product Name *</label>
                  <input
                    type="text"
                    value={purchaseForm.customProduct}
                    onChange={(e) => handlePurchaseFormChange('customProduct', e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseForm.quantity}
                  onChange={(e) => handlePurchaseFormChange('quantity', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Unit Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseForm.unitPrice}
                  onChange={(e) => handlePurchaseFormChange('unitPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseForm.total}
                  onChange={(e) => handlePurchaseFormChange('total', e.target.value)}
                  placeholder="Auto-calculated"
                />
              </div>

              <div className="form-group form-group-full">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={purchaseForm.cwo}
                    onChange={(e) => handlePurchaseFormChange('cwo', e.target.checked)}
                  />
                  <span>Check With Order (CWO) - 10% commission bonus</span>
                </label>
              </div>

              <div className="form-group form-group-full">
                <label>Notes</label>
                <textarea
                  value={purchaseForm.notes}
                  onChange={(e) => handlePurchaseFormChange('notes', e.target.value)}
                  placeholder="Optional notes about this purchase..."
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={cancelPurchaseForm}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={addPurchase}>
                {editingPurchase ? 'Update Purchase' : 'Save Purchase'}
              </button>
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3>Contacts ({customer.contacts.length})</h3>
          {customer.contacts.map((contact, index) => (
            <div key={index} className={`contact-detail ${contact.isPrimary ? 'primary' : ''}`}>
              <div className="contact-detail-header">
                <h4>{contact.name}</h4>
                {contact.isPrimary && <span className="badge-small">Primary</span>}
              </div>
              {contact.title && <p className="contact-title">{contact.title}</p>}
              {contact.phone && (
                <p className="contact-info">
                  📞 <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </p>
              )}
              {contact.email && (
                <p className="contact-info">
                  ✉️ <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </p>
              )}
              {contact.bestTime && (
                <p className="contact-info">⏰ Best time: {contact.bestTime}</p>
              )}
            </div>
          ))}
        </div>

        <div className="detail-section">
          <div className="notes-header">
            <h3>Notes & Activity ({(customer.notes || []).length})</h3>
            <button className="btn btn-primary btn-small" onClick={() => setShowNoteForm(!showNoteForm)}>
              + Add Note
            </button>
          </div>

          {showNoteForm && (
            <div className="note-form">
              <h4>{editingNote ? '✏️ Edit Note' : '+ Add New Note'}</h4>
              <div className="form-field">
                <label>Spoke with:</label>
                <select value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                  {customer.contacts.map((contact, i) => (
                    <option key={i} value={contact.name}>{contact.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <div className="note-input-header">
                  <label>Note:</label>
                  {voiceSupported && (
                    <button
                      type="button"
                      className={`btn-voice ${isRecording ? 'recording' : ''}`}
                      onClick={toggleVoiceRecording}
                      title={isRecording ? 'Stop recording' : 'Start voice recording'}
                    >
                      {isRecording ? (
                        <>
                          <span className="recording-indicator">⏺</span>
                          Recording...
                        </>
                      ) : (
                        <>
                          🎤 Voice Note
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows="4"
                  placeholder={isRecording ? "Listening... speak now!" : "What did you discuss? Any action items or follow-ups needed?"}
                  className={isRecording ? 'recording-active' : ''}
                />
                {isRecording && (
                  <div className="recording-hint">
                    💡 Speak clearly. The text will appear above. Click "Recording..." to stop.
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button className="btn btn-success" onClick={handleAddNote}>
                  {editingNote ? 'Update Note' : 'Save Note'}
                </button>
                <button className="btn btn-secondary" onClick={cancelNoteForm}>Cancel</button>
              </div>
            </div>
          )}

          {(customer.notes || []).length > 0 && (
            <div className="notes-filter">
              <label>Filter by contact:</label>
              <select value={filterContact} onChange={(e) => setFilterContact(e.target.value)}>
                <option value="All">All Contacts</option>
                {customer.contacts.map((contact, i) => (
                  <option key={i} value={contact.name}>{contact.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="notes-list">
            {filteredNotes.length === 0 && (
              <p className="empty-state">No notes yet. Click "Add Note" to get started!</p>
            )}
            {filteredNotes.map(note => (
              <div key={note.id} className={`note-item ${note.type ? `note-type-${note.type}` : ''}`}>
                <div className="note-item-main">
                  <div className="note-header">
                    {note.type === 'followup' && <span className="note-tag followup-tag">📅 Follow-Up Completed</span>}
                    {note.type === 'delivery' && <span className="note-tag delivery-tag">📦 Delivery Completed</span>}
                    <strong>Spoke with: {note.contactName}</strong>
                    <span className="note-date">{new Date(note.date).toLocaleString()}</span>
                  </div>
                  <p className="note-text">{note.text}</p>
                  <div className="note-footer">Added by: {note.addedBy}</div>
                </div>
                <div className="note-item-actions">
                  <button 
                    className="btn-icon"
                    onClick={() => editNote(note)}
                    title="Edit note"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-icon"
                    onClick={() => deleteNote(note.id)}
                    title="Delete note"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Complete Follow-up Dialog */}
      {showCompleteFollowup && (
        <div className="modal-overlay" onClick={() => setShowCompleteFollowup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✓ Complete Follow-Up</h3>
            
            <div className="form-group">
              <label>Notes (optional):</label>
              <textarea
                value={followupNote}
                onChange={(e) => setFollowupNote(e.target.value)}
                placeholder="What was discussed? Any outcomes?"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Schedule Next Follow-Up:</label>
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
              />
              <div className="help-text">
                💡 Suggested: 3 months from today
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={saveFollowupCompletion}
              >
                Save
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCompleteFollowup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Delivery Dialog */}
      {showCompleteDelivery && (
        <div className="modal-overlay" onClick={() => setShowCompleteDelivery(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✓ Confirm Delivery</h3>
            
            <div className="form-group">
              <label>Select Purchase Delivered:</label>
              <select
                value={selectedPurchaseForDelivery || ''}
                onChange={(e) => setSelectedPurchaseForDelivery(e.target.value)}
              >
                <option value="">-- Select Purchase --</option>
                {(customer.purchases || [])
                  .filter(p => !p.delivered)
                  .map(purchase => (
                    <option key={purchase.id} value={purchase.id}>
                      {purchase.product} - Qty: {purchase.quantity} - ${purchase.total} ({new Date(purchase.date).toLocaleDateString()})
                    </option>
                  ))}
              </select>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={saveDeliveryCompletion}
                disabled={!selectedPurchaseForDelivery}
              >
                Confirm Delivery
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCompleteDelivery(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Order Modal */}
      {showQuickOrder && (
        <div className="modal-overlay" onClick={cancelQuickOrder}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>💰 New Order - {customer.name}</h3>
            
            {/* Products in Order */}
            {orderProducts.length > 0 && (
              <div className="order-products-list">
                <h4>Products in Order:</h4>
                {orderProducts.map(product => (
                  <div key={product.id} className="order-product-item">
                    <div className="order-product-info">
                      <strong>{product.quantity}</strong> × {product.product} @ ${product.unitPrice.toFixed(2)} = <strong>${product.total.toFixed(2)}</strong>
                    </div>
                    <button 
                      className="btn-icon btn-delete"
                      onClick={() => removeProductFromOrder(product.id)}
                      title="Remove product"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Product Section */}
            <div className="add-product-section">
              <h4>Add Product:</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Product *</label>
                  <select
                    value={currentProduct}
                    onChange={(e) => setCurrentProduct(e.target.value)}
                  >
                    <option value="">-- Select Product --</option>
                    {productList.map(product => (
                      <option key={product} value={product}>{product}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label>Unit Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentUnitPrice}
                    onChange={(e) => setCurrentUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <button 
                className="btn btn-success btn-full-width"
                onClick={addProductToOrder}
              >
                + Add to Order
              </button>
            </div>

            {/* Order Options */}
            <div className="order-options">
              <h4>Order Options:</h4>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={orderCWO}
                    onChange={(e) => setOrderCWO(e.target.checked)}
                  />
                  <span>Check With Order (CWO) - 10% commission bonus</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={orderPendingDelivery}
                    onChange={(e) => setOrderPendingDelivery(e.target.checked)}
                  />
                  <span>Order Needs Delivery (marks delivery as pending)</span>
                </label>
              </div>

              {orderPendingDelivery && (
                <div className="form-group">
                  <label>Expected Delivery Date: *</label>
                  <input
                    type="date"
                    value={orderDeliveryDate}
                    onChange={(e) => setOrderDeliveryDate(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Order Notes:</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows="2"
                  placeholder="Any special instructions or notes about this order..."
                />
              </div>
            </div>

            {/* Order Total */}
            {orderProducts.length > 0 && (
              <div className="order-total">
                <strong>Order Total: ${calculateOrderTotal()}</strong>
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={saveQuickOrder}
                disabled={orderProducts.length === 0}
              >
                Save Order
              </button>
              <button 
                className="btn btn-secondary"
                onClick={cancelQuickOrder}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Follow-up Date Dialog */}
      {showChangeFollowupDate && (
        <div className="modal-overlay" onClick={() => setShowChangeFollowupDate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📅 {customer.followUpDate ? 'Change' : 'Set'} Follow-Up Date</h3>
            
            <div className="form-group">
              <label>Follow-Up Date:</label>
              <input
                type="date"
                value={newFollowupDate}
                onChange={(e) => setNewFollowupDate(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={saveNewFollowupDate}
              >
                Save
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowChangeFollowupDate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Delivery Pending Dialog */}
      {showMarkDeliveryPending && (
        <div className="modal-overlay" onClick={() => setShowMarkDeliveryPending(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📦 Mark Delivery Pending</h3>
            
            <div className="form-group">
              <label>Expected Delivery Date:</label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={saveDeliveryPending}
              >
                Save
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowMarkDeliveryPending(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Delivery Date Dialog */}
      {showChangeDeliveryDate && (
        <div className="modal-overlay" onClick={() => setShowChangeDeliveryDate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📦 Delivery Date</h3>
            
            <div className="form-group">
              <label>Expected Delivery Date:</label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
              />
            </div>

            <div className="modal-actions-stacked">
              <button 
                className="btn btn-primary"
                onClick={saveNewDeliveryDate}
              >
                Save Date
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleCancelDelivery}
              >
                Cancel Delivery
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowChangeDeliveryDate(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Dialog */}
      {showDemoDialog && selectedDemo && (
        <div className="modal-overlay" onClick={() => setShowDemoDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{customer.demos[selectedDemo]?.completed ? '✅' : '⭕'} {selectedDemo}</h3>
            
            {customer.demos[selectedDemo]?.completed ? (
              <>
                <p>This demo was completed on {customer.demos[selectedDemo]?.date ? new Date(customer.demos[selectedDemo].date).toLocaleDateString() : 'unknown date'}.</p>
                
                <div className="form-group">
                  <label>Change Date:</label>
                  <input
                    type="date"
                    value={demoDate}
                    onChange={(e) => setDemoDate(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={saveDemoDate}
                  >
                    Update Date
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={toggleDemoComplete}
                  >
                    Mark Incomplete
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowDemoDialog(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Mark this demo as complete?</p>
                
                <div className="form-group">
                  <label>Completion Date:</label>
                  <input
                    type="date"
                    value={demoDate}
                    onChange={(e) => setDemoDate(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    className="btn btn-success"
                    onClick={saveDemoDate}
                  >
                    Mark Complete
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowDemoDialog(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;