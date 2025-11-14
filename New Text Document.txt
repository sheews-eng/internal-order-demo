# Internal Order System

这是一个简单的内部订单管理系统，支持 **Salesman 下单** 和 **Admin 管理订单**。  

特性：

- Salesman 页面可以为每个客户添加多条不同商品订单，记录数量和单价
- Admin 页面可以查看所有订单，按客户和销售员分组显示
- 支持订单状态管理：Pending → Ordered → Completed
- 自动提示新订单（提示音 ding.mp3）
- 使用 **Firebase Realtime Database** 实时同步订单数据
- 部署在 **Cloudflare Pages** 上，静态网站 + Firebase 实时数据库

## 项目结构

internal-order-demo/
├─ public/
│ └─ ding.mp3 # 提示音
├─ index.html # 登录重定向
├─ admin.html # 管理员页面
├─ salesman.html # 销售员页面
├─ script.js # JS 核心逻辑
├─ styles.css # 样式
└─ README.md # 项目说明


## Firebase 配置

在 `script.js` 中初始化 Firebase：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
