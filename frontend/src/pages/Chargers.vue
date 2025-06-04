<template>
  <div class="chargers-container">
    <div class="header">
      <h2>Charging Stations</h2>
      <div class="header-actions">
        <button class="btn-logout" @click="logout">Logout</button>
        <router-link to="/map" class="btn-map">View on Map</router-link>
      </div>
    </div>

    <!-- Add/Edit Charger Form - Moved to top -->
    <div class="form-section">
      <h3>{{ form._id ? 'Edit Charger' : 'Add New Charger' }}</h3>
      <form @submit.prevent="form._id ? updateCharger() : addCharger()" class="add-charger-form">
        <input v-model="form.name" placeholder="Charger Name" required />
        <input v-model.number="form.lat" placeholder="Latitude" required type="number" step="any" />
        <input v-model.number="form.lng" placeholder="Longitude" required type="number" step="any" />
        <select v-model="form.status" required>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <input v-model.number="form.powerOutput" placeholder="Power Output (kW)" required type="number" />
        <input v-model="form.connectorType" placeholder="Connector Type (e.g., CCS, Type2)" required />
        <button type="submit" class="btn-add">{{ form._id ? 'Update' : 'Add' }} Charger</button>
      </form>

      <p v-if="message" :class="message.includes('Failed') ? 'error-message' : 'success-message'">{{ message }}</p>
    </div>

    <hr />

    <!-- Filters -->
    <div class="filters">
      <select v-model="filters.status">
        <option value="">All Statuses</option>
        <option>Active</option>
        <option>Inactive</option>
      </select>
      <select v-model="filters.connectorType">
        <option value="">All Connectors</option>
        <option>CCS</option>
        <option>Type2</option>
        <option>CHAdeMO</option>
      </select>
      <input v-model.number="filters.minPower" type="number" placeholder="Min Power (kW)" />
    </div>

    <!-- Charger List -->
    <ul v-if="filteredChargers.length" class="charger-list">
      <li v-for="c in filteredChargers" :key="c._id" class="charger-item">
        <strong>{{ c.name }}</strong><br />
        <span>Status: <span :class="c.status.toLowerCase()">{{ c.status }}</span></span> |
        <span>Power: {{ c.powerOutput }} kW</span> |
        <span>Connector: {{ c.connectorType }}</span>
        <div class="item-actions">
          <button @click="editCharger(c)">Edit</button>
          <button @click="deleteCharger(c._id)">Delete</button>
        </div>
      </li>
    </ul>
    <p v-else class="no-chargers">No chargers match the selected filters.</p>
  </div>
</template>

<script>
import axios from '../utils/axios';

export default {
  data() {
    return {
      chargers: [],
      message: '',
      form: {
        _id: null,
        name: '',
        lat: null,
        lng: null,
        status: 'Active',
        powerOutput: null,
        connectorType: ''
      },
      filters: {
        status: '',
        connectorType: '',
        minPower: 0
      }
    };
  },
  computed: {
    filteredChargers() {
      return this.chargers.filter(c =>
        (!this.filters.status || c.status === this.filters.status) &&
        (!this.filters.connectorType || c.connectorType === this.filters.connectorType) &&
        (!this.filters.minPower || c.powerOutput >= this.filters.minPower)
      );
    }
  },
  methods: {
    async fetchChargers() {
      try {
        const res = await axios.get('/chargers');
        this.chargers = res.data;
      } catch (err) {
        console.error('Error fetching chargers:', err);
      }
    },
    async addCharger() {
      try {
        await axios.post('/chargers', {
          name: this.form.name,
          location: { lat: this.form.lat, lng: this.form.lng },
          status: this.form.status,
          powerOutput: this.form.powerOutput,
          connectorType: this.form.connectorType
        });
        this.message = 'Charger added!';
        this.fetchChargers();
        this.resetForm();
      } catch (err) {
        this.message = 'Failed to add charger.';
      }
    },
    editCharger(charger) {
      this.form = {
        _id: charger._id,
        name: charger.name,
        lat: charger.location.lat,
        lng: charger.location.lng,
        status: charger.status,
        powerOutput: charger.powerOutput,
        connectorType: charger.connectorType
      };
      
      // Scroll to form when editing
      this.$el.querySelector('.form-section').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    },
    async updateCharger() {
      try {
        await axios.put(`/chargers/${this.form._id}`, {
          name: this.form.name,
          location: { lat: this.form.lat, lng: this.form.lng },
          status: this.form.status,
          powerOutput: this.form.powerOutput,
          connectorType: this.form.connectorType
        });
        this.message = 'Charger updated!';
        this.fetchChargers();
        this.resetForm();
      } catch (err) {
        this.message = 'Failed to update charger.';
      }
    },
    async deleteCharger(id) {
      if (!confirm('Are you sure you want to delete this charger?')) return;
      try {
        await axios.delete(`/chargers/${id}`);
        this.message = 'Charger deleted!';
        this.fetchChargers();
      } catch (err) {
        this.message = 'Failed to delete charger.';
      }
    },
    resetForm() {
      this.form = {
        _id: null,
        name: '',
        lat: null,
        lng: null,
        status: 'Active',
        powerOutput: null,
        connectorType: ''
      };
    },
    logout() {
      localStorage.removeItem('token');
      this.$router.push('/');
    }
  },
  mounted() {
    this.fetchChargers();
  }
};
</script>

<style scoped>
.chargers-container {
  max-width: 700px;
  margin: 40px auto;
  background: #fff;
  padding: 30px 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.header h2 {
  margin: 0;
  font-weight: 700;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.btn-logout,
.btn-map {
  background-color: #3f51b5;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: background-color 0.3s ease;
}

.btn-logout:hover,
.btn-map:hover {
  background-color: #303f9f;
}

.form-section {
  margin-bottom: 30px;
}

.form-section h3 {
  color: #3f51b5;
  font-weight: 600;
  margin-bottom: 20px;
}

.add-charger-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.add-charger-form input,
.add-charger-form select {
  padding: 12px 15px;
  border-radius: 6px;
  border: 1.5px solid #ccc;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.add-charger-form input:focus,
.add-charger-form select:focus {
  outline: none;
  border-color: #3f51b5;
  box-shadow: 0 0 8px rgba(63, 81, 181, 0.25);
}

.add-charger-form input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
  -webkit-appearance: none;
}

.add-charger-form input[type='number']::-webkit-inner-spin-button,
.add-charger-form input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.add-charger-form button.btn-add {
  grid-column: 1 / -1;
  background-color: #3f51b5;
  color: white;
  font-weight: 600;
  border: none;
  padding: 14px 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  transition: background-color 0.3s ease;
}

.add-charger-form button.btn-add:hover {
  background-color: #303f9f;
}

.success-message {
  color: #4caf50;
  font-weight: 600;
  margin-top: 20px;
  text-align: center;
}

.error-message {
  color: #e53935;
  font-weight: 600;
  margin-top: 20px;
  text-align: center;
}

hr {
  margin: 35px 0;
  border: none;
  border-top: 1px solid #ddd;
}

.filters {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.filters input,
.filters select {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 14px;
  min-width: 150px;
}

.charger-list {
  list-style-type: none;
  padding: 0;
  margin-top: 20px;
}

.charger-item {
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 12px;
  background-color: #f9faff;
  box-shadow: 0 2px 5px rgba(63, 81, 181, 0.1);
  transition: box-shadow 0.3s ease;
}

.charger-item:hover {
  box-shadow: 0 4px 12px rgba(63, 81, 181, 0.25);
}

.charger-item strong {
  font-size: 18px;
  color: #2c3e50;
}

.charger-item span {
  font-size: 14px;
  color: #555;
  margin-right: 10px;
}

.active {
  color: #4caf50;
  font-weight: 600;
}

.inactive {
  color: #e53935;
  font-weight: 600;
}

.item-actions {
  margin-top: 10px;
}

.item-actions button {
  background-color: #ff9800;
  color: white;
  border: none;
  padding: 5px 12px;
  margin-right: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.item-actions button:hover {
  background-color: #f57c00;
}

.no-chargers {
  margin-top: 20px;
  color: #777;
  font-style: italic;
}

/* Responsive */
@media (max-width: 600px) {
  .add-charger-form {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    margin-top: 15px;
    width: 100%;
    justify-content: flex-start;
  }
}
</style>