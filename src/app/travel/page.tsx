'use client';

import { useState, useEffect } from 'react';
import { Compass, Plus, Trash2, Check, MapPin, Star, DollarSign, ListTodo } from 'lucide-react';
import { getDB, type LocalTrip, type LocalTripPackingItem, type LocalPlace, type LocalRestaurant } from '@/lib/db';
import styles from './travel.module.css';

export default function TravelPage() {
  const db = getDB();
  const [activeTab, setActiveTab] = useState<'trips' | 'packing' | 'places' | 'food'>('trips');

  // Trips State
  const [trips, setTrips] = useState<LocalTrip[]>([]);
  const [tripName, setTripName] = useState('');
  const [tripBudget, setTripBudget] = useState('');
  const [tripStart, setTripStart] = useState('');
  const [tripEnd, setTripEnd] = useState('');

  // Packing State
  const [packingItems, setPackingItems] = useState<LocalTripPackingItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [packName, setPackName] = useState('');
  const [packQty, setPackQty] = useState('1');
  const [packCategory, setPackCategory] = useState('Electronics');

  // Places State
  const [places, setPlaces] = useState<LocalPlace[]>([]);
  const [placeName, setPlaceName] = useState('');
  const [placeCategory, setPlaceCategory] = useState<'local' | 'india' | 'international'>('local');
  const [placeMap, setPlaceMap] = useState('');
  const [placePriority, setPlacePriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Restaurants State
  const [restaurants, setRestaurants] = useState<LocalRestaurant[]>([]);
  const [restName, setRestName] = useState('');
  const [restLoc, setRestLoc] = useState('');
  const [restDish, setRestDish] = useState('');
  const [restRating, setRestRating] = useState('5');
  const [restCity, setRestCity] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const tList = await db.trips.toArray();
      setTrips(tList);
      if (tList.length > 0 && !selectedTripId) {
        setSelectedTripId(tList[0].id);
      }

      const pList = await db.places.toArray();
      setPlaces(pList);

      const rList = await db.restaurants.toArray();
      setRestaurants(rList);
    }
    loadData();
  }, [refreshKey]);

  useEffect(() => {
    async function loadPacking() {
      if (!selectedTripId) return;
      const list = await db.tripPackingItems.where('trip_id').equals(selectedTripId).toArray();
      setPackingItems(list);
    }
    loadPacking();
  }, [selectedTripId, refreshKey]);

  const addTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName || !tripBudget) return;

    await db.trips.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: tripName,
      budget: parseFloat(tripBudget),
      start_date: tripStart || new Date().toISOString().split('T')[0],
      end_date: tripEnd || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setTripName('');
    setTripBudget('');
    setTripStart('');
    setTripEnd('');
    setRefreshKey(prev => prev + 1);
  };

  const deleteTrip = async (id: string) => {
    await db.trips.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  // Packing
  const addPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packName || !selectedTripId) return;

    await db.tripPackingItems.add({
      id: crypto.randomUUID(),
      trip_id: selectedTripId,
      name: packName,
      quantity: parseInt(packQty, 10) || 1,
      packed: false,
      category: packCategory,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setPackName('');
    setPackQty('1');
    setRefreshKey(prev => prev + 1);
  };

  const togglePacked = async (id: string, currentPacked: boolean) => {
    await db.tripPackingItems.update(id, { packed: !currentPacked });
    setRefreshKey(prev => prev + 1);
  };

  // Place
  const addPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName) return;

    await db.places.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: placeName,
      category: placeCategory,
      maps_link: placeMap || undefined,
      priority: placePriority,
      visited: false,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setPlaceName('');
    setPlaceMap('');
    setRefreshKey(prev => prev + 1);
  };

  const toggleVisitedPlace = async (id: string, currentVisited: boolean) => {
    await db.places.update(id, { visited: !currentVisited });
    setRefreshKey(prev => prev + 1);
  };

  // Restaurant
  const addRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName || !restCity) return;

    await db.restaurants.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: restName,
      location: restLoc,
      recommended_dishes: restDish ? [restDish] : [],
      rating: parseFloat(restRating) || 5,
      city: restCity,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setRestName('');
    setRestLoc('');
    setRestDish('');
    setRestCity('');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page">
      <div className={styles.tabBar}>
        <button onClick={() => setActiveTab('trips')} className={activeTab === 'trips' ? styles.tabActive : styles.tab}>Trips</button>
        <button onClick={() => setActiveTab('packing')} className={activeTab === 'packing' ? styles.tabActive : styles.tab}>Packing</button>
        <button onClick={() => setActiveTab('places')} className={activeTab === 'places' ? styles.tabActive : styles.tab}>Places</button>
        <button onClick={() => setActiveTab('food')} className={activeTab === 'food' ? styles.tabActive : styles.tab}>Restaurants</button>
      </div>

      {activeTab === 'trips' && (
        <div>
          <form onSubmit={addTrip} className={styles.formCard}>
            <h4 className={styles.formTitle}>Plan Trip Budget</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Trip Name (e.g. Goa Vacation, Office Trip)"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <input
                type="number"
                placeholder="Budget (₹)"
                value={tripBudget}
                onChange={(e) => setTripBudget(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="date"
                value={tripStart}
                onChange={(e) => setTripStart(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              <Plus size={16} /> Save Trip
            </button>
          </form>

          {/* List */}
          <h3 className={styles.sectionHeader}>Planned Trips</h3>
          <div className={styles.tripsList}>
            {trips.map(trip => (
              <div key={trip.id} className={styles.tripCard}>
                <div>
                  <strong className={styles.tripName}>{trip.name}</strong>
                  <span className={styles.tripSub}>Budget: ₹{trip.budget} | Start: {trip.start_date}</span>
                </div>
                <button onClick={() => deleteTrip(trip.id)} className={styles.deleteBtn}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'packing' && (
        <div>
          {trips.length === 0 ? (
            <p className={styles.emptyState}>Register a trip first before packing.</p>
          ) : (
            <div>
              <form onSubmit={addPackingItem} className={styles.formCard}>
                <h4 className={styles.formTitle}>Add Packing Item</h4>
                <div className={styles.formGroup}>
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className={styles.input}
                  >
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroupRow}>
                  <input
                    type="text"
                    placeholder="Item (e.g. Passport, Charger)"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <input
                    type="number"
                    value={packQty}
                    onChange={(e) => setPackQty(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>Add to Suitcase</button>
              </form>

              {/* Checklist */}
              <h3 className={styles.sectionHeader}>Packing Checklist</h3>
              <div className={styles.packingList}>
                {packingItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => togglePacked(item.id, item.packed)}
                    className={item.packed ? styles.packedItemCard : styles.itemCard}
                  >
                    <div className={styles.checkbox}>
                      {item.packed && <Check size={16} color="white" />}
                    </div>
                    <span className={item.packed ? styles.packedText : styles.packText}>
                      {item.name} (Qty: {item.quantity})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'places' && (
        <div>
          <form onSubmit={addPlace} className={styles.formCard}>
            <h4 className={styles.formTitle}>Places to Visit</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Place Name (e.g. Eiffel Tower, local park)"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <select
                value={placeCategory}
                onChange={(e: any) => setPlaceCategory(e.target.value)}
                className={styles.input}
              >
                <option value="local">Local</option>
                <option value="india">National</option>
                <option value="international">International</option>
              </select>
              <select
                value={placePriority}
                onChange={(e: any) => setPlacePriority(e.target.value)}
                className={styles.input}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Google Maps link"
                value={placeMap}
                onChange={(e) => setPlaceMap(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>Add Place</button>
          </form>

          {/* List */}
          <h3 className={styles.sectionHeader}>Bucketed Places</h3>
          <div className={styles.placesList}>
            {places.map(place => (
              <div
                key={place.id}
                onClick={() => toggleVisitedPlace(place.id, place.visited)}
                className={place.visited ? styles.visitedCard : styles.placeCard}
              >
                <div>
                  <strong className={place.visited ? styles.visitedText : styles.placeNameText}>{place.name}</strong>
                  <span className={styles.placeSub}>{place.category} • Priority: {place.priority}</span>
                </div>
                {place.maps_link && (
                  <a href={place.maps_link} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                    <MapPin size={16} /> Map
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'food' && (
        <div>
          <form onSubmit={addRestaurant} className={styles.formCard}>
            <h4 className={styles.formTitle}>Log Restaurant Recommended Dishes</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Restaurant Name"
                value={restName}
                onChange={(e) => setRestName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <input
                type="text"
                placeholder="City (e.g. Bangalore, Delhi)"
                value={restCity}
                onChange={(e) => setRestCity(e.target.value)}
                className={styles.input}
                required
              />
              <select
                value={restRating}
                onChange={(e) => setRestRating(e.target.value)}
                className={styles.input}
              >
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Recommended Dish (e.g. Best Biryani)"
                value={restDish}
                onChange={(e) => setRestDish(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>Save Recommendation</button>
          </form>

          {/* List */}
          <h3 className={styles.sectionHeader}>Restaurant Recommendations</h3>
          <div className={styles.restaurantsList}>
            {restaurants.map(r => (
              <div key={r.id} className={styles.restCard}>
                <div>
                  <strong className={styles.restNameText}>{r.name}</strong>
                  <span className={styles.restCityText}>{r.city} {r.location && `• ${r.location}`}</span>
                  {r.recommended_dishes && r.recommended_dishes.length > 0 && (
                    <p className={styles.recommendedDishText}>⭐ Try: {r.recommended_dishes[0]}</p>
                  )}
                </div>
                <div className={styles.ratingStars}>
                  <Star size={14} fill="var(--accent-warning)" color="var(--accent-warning)" />
                  <span>{r.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
