<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.appspot.com",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5",
  measurementId: "G-H0FVWM7V1R"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.firebaseDB = db;
window.pushOrder = (order) => push(ref(db, 'orders'), order);
window.onOrdersChange = (callback) => {
  onValue(ref(db, 'orders'), snapshot => callback(snapshot.val() || {}));
};
window.updateOrderStatus = (id, status) => set(ref(db, 'orders/' + id + '/status'), status);
</script>
