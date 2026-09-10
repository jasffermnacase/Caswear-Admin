import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    addDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


//FIREBASE
const firebaseConfig = {

    apiKey:
        "AIzaSyAqlEDKaGECuc8ycmzZVHD7gQeZcqnm7ek",
    authDomain:
        "caswear-c21e2.firebaseapp.com",
    projectId:
        "caswear-c21e2",
    storageBucket:
        "caswear-c21e2.firebasestorage.app",
    messagingSenderId:
        "842998215942",
    appId:
        "1:842998215942:web:fcd283e0cd118451951a87",
    measurementId:
        "G-317N3TECX6"
};


//INITIALIZE FIREBASE
const app =
    initializeApp(firebaseConfig);
const db =
    getFirestore(app);
const auth =
    getAuth(app);


//GLOBAL DATA
let orders = [];
let users = [];
let payments = [];
let products = [];
let currentOrderFilter = "all";
let currentSearch = "";
let programChartInstance = null;


//ADMIN AUTHENTICATION
onAuthStateChanged(auth, (user) => {
    const adminEmail =
        document.getElementById("adminEmail");
    if (!user) {
        console.log("No admin logged in.");
        if (adminEmail) {
            adminEmail.textContent =
                "Not logged in";
        }
        if (
            !window.location.pathname
                .endsWith("admin-login.html")
        ) {
            window.location.replace(
                "admin-login.html"
            );
        }
        return;
    }
    console.log(
        "Admin logged in:",
        user.email
    );
    if (adminEmail) {
        adminEmail.textContent =
            user.email || "Admin";
    }
});

function normalizeStatus(status) {
    if (
        status === undefined ||
        status === null ||
        status === ""
    ) {
        return "pending";
    }

    return String(status)
        .trim()
        .toLowerCase();
}


//GET PAYMENT METHOD
function getPaymentMethod(order) {

    if (!order) {
        return "";

    }


    return (
        order.paymentMethod ||
        order.paymentMethodName ||
        order.method ||
        order.payment_type ||
        order.paymentType ||
        order.payment ||
        order.payment_method ||
        order.type ||
        ""
    );
}

//NORMALIZE PAYMENT METHOD
function normalizePaymentMethod(order) {
    return String(
        getPaymentMethod(order)
    )
        .trim()
        .toLowerCase();
}

//CHECK IF ONLINE PAYMENT
function isGcashPayment(order) {

    if (!order) {

        return false;

    }

    const method =
        normalizePaymentMethod(order);
    return (

        method.includes("gcash") ||
        method.includes("paymongo") ||
        method.includes("online") ||
        method.includes("e-wallet") ||
        method.includes("ewallet")
    );
}


//CHECK IF PAYMENT IS CASH
function isCashPayment(order) {

    if (!order) {
        return false;
    }

    if (
        isGcashPayment(order)
    ) {
        return false;
    }

    const method =
        normalizePaymentMethod(order);
    if (!method) {
        return false;
    }

    return (
        method === "cash" ||
        method === "cash payment" ||
        method === "cashpayment" ||
        method === "cod" ||
        method === "cash on delivery" ||
        /\bcash\b/.test(method)
    );

}


//PROGRAM NAME
function getProgramName(program) {
    if (
        program === undefined ||
        program === null ||
        String(program).trim() === ""
    ) {
        return "N/A";
    }

    const value =
        String(program)
            .trim()
            .toLowerCase();
    const programMap = {
        "bsp":
            "BSPsych",
        "bs psych":
            "BSPsych",
        "bs psychology":
            "BSPsych",
        "bspsych":
            "BSPsych",
        "b.s. psychology":
            "BSPsych",
        "bachelor of science in psychology":
            "BSPsych",

        "bsit":
            "BSIT",
        "bs it":
            "BSIT",
        "b.s. information technology":
            "BSIT",
        "bachelor of science in information technology":
            "BSIT",

        "bscs":
            "BSCS",
        "bs cs":
            "BSCS",
        "bs computer science":
            "BSCS",

        "bsoa":
            "BSOA",
        "bs oa":
            "BSOA",

        "bshm":
            "BSHM",
        "bs hm":
            "BSHM",

        "bstm":
            "BSTM",
        "bs tm":
            "BSTM"

    };

    return (
        programMap[value] ||
        String(program).trim()
    );
}



function normalizeProgramForStorage(value) {
    if (!value) {
        return "";
    }
    const program = String(value)
        .trim()
        .toUpperCase()
        .replace(/\./g, "")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ");
    if (
        program === "IS" ||
        program === "BSIS" ||
        program === "BS IS" ||
        program === "INFORMATION SYSTEMS" ||
        program === "BACHELOR OF SCIENCE IN INFORMATION SYSTEMS"
    ) {
        return "IS";
    }

    if (
        program === "IT" ||
        program === "BSIT" ||
        program === "BS IT" ||
        program === "INFORMATION TECHNOLOGY" ||
        program === "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY"
    ) {
        return "IT";
    }

    if (
        program === "STAT" ||
        program === "BSSTAT" ||
        program === "BS STAT" ||
        program === "STATISTICS" ||
        program === "BACHELOR OF SCIENCE IN STATISTICS"
    ) {
        return "STAT";
    }

    if (
        program === "PSYCH" ||
        program === "BSPYCH" ||
        program === "BSPSYCH" ||
        program === "PSYCHOLOGY" ||
        program === "BACHELOR OF SCIENCE IN PSYCHOLOGY"
    ) {
        return "PSYCH";
    }

    if (
        program === "PROV" ||
        program === "PROVINCE" ||
        program === "PROVINCIAL"
    ) {
        return "PROVINCIAL";
    }

    return program;
}


//GET ORDER PROGRAM
function getOrderProgram(order) {

    return getProgramName(
        order.program ||
        order.programName ||
        order.course ||
        order.courseName ||
        order.degree ||
        order.degreeProgram
    );
}


//GET STUDENT OR CUSTOMER NAME
function getCustomerName(order) {
    return (
        order.studentName ||
        order.student ||
        order.customerName ||
        order.fullname ||
        order.fullName ||
        order.name ||
        order.customer ||
        "Unknown Student"
    );
}


//GET ORDER IDENTITIES
function getOrderIdentifiers(order) {
    if (!order) {
        return [];
    }
    return [
        order.id,
        order.orderId,
        order.orderID,
        order.order_id,
        order.orderNumber,
        order.orderNo,
        order.reservationId,
        order.reservationID,
        order.reservationNumber,
        order.reservationNo,
        order.transactionOrderId,
        order.checkoutOrderId,
        order.transactionId,
        order.transactionID,
        order.checkoutId,
        order.checkoutID
    ]

    .filter(value =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    )

    .map(value =>
        String(value)
            .trim()
            .toLowerCase()
    );

}


// ======================================================
// GET PAYMENT DOCUMENT IDENTIFIERS
// ======================================================

function getPaymentIdentifiers(payment) {

    if (!payment) {

        return [];

    }


    return [

        payment.orderId,

        payment.orderID,

        payment.order_id,

        payment.orderNumber,

        payment.orderNo,

        payment.reservationId,

        payment.reservationID,

        payment.reservationNumber,

        payment.reservationNo,

        payment.transactionOrderId,

        payment.checkoutOrderId,

        payment.transactionId,

        payment.transactionID,

        payment.checkoutId,

        payment.checkoutID

    ]

    .filter(value =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    )

    .map(value =>
        String(value)
            .trim()
            .toLowerCase()
    );

}


// ======================================================
// CHECK IF REFERENCE IS VALID
// ======================================================

function isValidReference(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return false;

    }


    const reference =
        String(value).trim();


    if (!reference) {

        return false;

    }


    const normalized =
        reference.toLowerCase();


    if (

        normalized === "n/a" ||

        normalized === "na" ||

        normalized === "none" ||

        normalized === "null" ||

        normalized === "undefined" ||

        normalized === "no reference number"

    ) {

        return false;

    }


    return true;

}


// ======================================================
// GET PAYMENT REFERENCE
// ======================================================

function getPaymentReference(payment) {

    if (!payment) {

        return "";

    }


    const possibleReferences = [

        payment.referenceNumber,

        payment.referenceNo,

        payment.reference,

        payment.paymentReference,

        payment.paymentReferenceNumber,

        payment.paymentRef,

        payment.paymentRefNumber,

        payment.gcashReference,

        payment.gcashReferenceNumber,

        payment.gcashRef,

        payment.gcashRefNumber,

        payment.paymongoReference,

        payment.paymongoReferenceNumber,

        payment.paymongoRef,

        payment.transactionReference,

        payment.transactionReferenceNumber,

        payment.transactionId,

        payment.transactionID,

        payment.checkoutReference,

        payment.checkoutReferenceNumber,

        payment.checkoutId,

        payment.checkoutID,

        payment.refNumber,

        payment.refNo,

        payment.externalReference,

        payment.externalReferenceNumber

    ];


    for (
        const value
        of possibleReferences
    ) {

        if (
            !isValidReference(value)
        ) {

            continue;

        }


        return String(value).trim();

    }


    return "";

}


// ======================================================
// GET PAYMENT DOCUMENT METHOD
// ======================================================

function getPaymentDocumentMethod(payment) {

    if (!payment) {

        return "";

    }


    return (

        payment.paymentMethod ||

        payment.paymentMethodName ||

        payment.method ||

        payment.payment_type ||

        payment.paymentType ||

        payment.payment ||

        payment.payment_method ||

        payment.type ||

        ""

    );

}


// ======================================================
// NORMALIZE PAYMENT DOCUMENT METHOD
// ======================================================

function normalizePaymentDocumentMethod(payment) {

    return String(
        getPaymentDocumentMethod(payment)
    )
        .trim()
        .toLowerCase();

}


// ======================================================
// CHECK IF PAYMENT DOCUMENT IS ONLINE
// ======================================================

function isOnlinePaymentDocument(payment) {

    if (!payment) {

        return false;

    }


    const method =
        normalizePaymentDocumentMethod(
            payment
        );


    return (

        method.includes("gcash") ||

        method.includes("paymongo") ||

        method.includes("online") ||

        method.includes("e-wallet") ||

        method.includes("ewallet")

    );

}


// ======================================================
// CHECK IF PAYMENT DOCUMENT IS CASH
// ======================================================

function isCashPaymentDocument(payment) {

    if (!payment) {

        return false;

    }


    if (
        isOnlinePaymentDocument(payment)
    ) {

        return false;

    }


    const method =
        normalizePaymentDocumentMethod(
            payment
        );


    if (!method) {

        return false;

    }


    return (

        method === "cash" ||

        method === "cash payment" ||

        method === "cashpayment" ||

        method === "cod" ||

        method === "cash on delivery" ||

        /\bcash\b/.test(method)

    );

}


// ======================================================
// FIND ORDER FOR PAYMENT
// ======================================================

function findOrderForPayment(payment) {

    if (!payment) {

        return null;

    }


    const paymentIdentifiers =
        getPaymentIdentifiers(payment);


    if (
        paymentIdentifiers.length === 0
    ) {

        return null;

    }


    return (

        orders.find(order => {

            const orderIdentifiers =
                getOrderIdentifiers(order);


            return orderIdentifiers.some(
                orderId =>
                    paymentIdentifiers.includes(
                        orderId
                    )
            );

        }) || null

    );

}


// ======================================================
// FIND ALL PAYMENTS FOR ORDER
// ======================================================

function findPaymentsForOrder(order) {

    if (!order) {

        return [];

    }


    const orderIdentifiers =
        getOrderIdentifiers(order);


    if (
        orderIdentifiers.length === 0
    ) {

        return [];

    }


    return payments.filter(payment => {

        const paymentIdentifiers =
            getPaymentIdentifiers(
                payment
            );


        if (
            paymentIdentifiers.length === 0
        ) {

            return false;

        }


        return paymentIdentifiers.some(
            paymentId =>
                orderIdentifiers.includes(
                    paymentId
                )
        );

    });

}


// ======================================================
// GET ORDER REFERENCE NUMBER
// ======================================================

function getReferenceNumber(order) {

    if (!order) {

        return "N/A";

    }


    if (
        isCashPayment(order)
    ) {

        return "N/A";

    }


    const directReference =
        getPaymentReference(order);


    if (
        directReference
    ) {

        return directReference;

    }


    const matchingPayments =
        findPaymentsForOrder(order);


    const sortedPayments =
        [...matchingPayments]
            .sort((a, b) => {

                const dateA =
                    getDateObject(
                        a.createdAt
                    );

                const dateB =
                    getDateObject(
                        b.createdAt
                    );


                return (

                    (dateB?.getTime() || 0) -

                    (dateA?.getTime() || 0)

                );

            });


    for (
        const payment
        of sortedPayments
    ) {

        if (
            isCashPaymentDocument(
                payment
            )
        ) {

            continue;

        }


        const reference =
            getPaymentReference(
                payment
            );


        if (
            reference
        ) {

            return reference;

        }

    }


    if (
        isGcashPayment(order)
    ) {

        return "No reference number";

    }


    return "N/A";

}


// ======================================================
// GET ORDER TOTAL
// ======================================================

function getOrderTotal(order) {

    const total =

        order.amount ??

        order.total ??

        order.totalAmount ??

        order.totalPrice ??

        order.grandTotal;


    if (
        total !== undefined &&
        total !== null
    ) {

        return Number(total) || 0;

    }


    if (
        order.price !== undefined &&
        order.price !== null
    ) {

        const price =
            Number(order.price) || 0;

        const quantity =
            Number(order.quantity) || 1;


        return price * quantity;

    }


    if (
        Array.isArray(order.items)
    ) {

        return order.items.reduce(

            (sum, item) => {

                const price =
                    Number(
                        item.price ??
                        item.amount ??
                        0
                    );


                const quantity =
                    Number(
                        item.quantity ?? 1
                    );


                return (
                    sum +
                    price * quantity
                );

            },

            0

        );

    }


    return 0;

}


// ======================================================
// FORMAT MONEY
// ======================================================

function formatMoney(amount) {

    return "₱" +

        Number(amount || 0)
            .toLocaleString(
                "en-PH",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

}


// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(timestamp) {

    if (!timestamp) {

        return "N/A";

    }


    let date;


    try {

        if (
            timestamp &&
            typeof timestamp.toDate === "function"
        ) {

            date =
                timestamp.toDate();

        }

        else if (
            timestamp instanceof Date
        ) {

            date =
                timestamp;

        }

        else if (
            typeof timestamp === "number"
        ) {

            date =
                new Date(timestamp);

        }

        else if (
            timestamp.seconds !== undefined
        ) {

            date =
                new Date(
                    timestamp.seconds * 1000
                );

        }

        else {

            date =
                new Date(timestamp);

        }

    }

    catch (error) {

        return "N/A";

    }


    if (
        !date ||
        isNaN(date.getTime())
    ) {

        return "N/A";

    }


    return date.toLocaleString(
        "en-PH",
        {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


// ======================================================
// GET DATE OBJECT
// ======================================================

function getDateObject(timestamp) {

    if (!timestamp) {

        return null;

    }


    try {

        if (
            timestamp &&
            typeof timestamp.toDate === "function"
        ) {

            return timestamp.toDate();

        }


        if (
            timestamp instanceof Date
        ) {

            return timestamp;

        }


        if (
            timestamp.seconds !== undefined
        ) {

            return new Date(
                timestamp.seconds * 1000
            );

        }


        return new Date(timestamp);

    }

    catch (error) {

        return null;

    }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ======================================================
// SET TEXT
// ======================================================

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


// ======================================================
// CREATE USER NOTIFICATION
// ======================================================

async function createUserNotification(
    order,
    type,
    message
) {

    if (!order.userId) {

        console.warn(
            "No userId found for notification.",
            order
        );

        return;

    }


    try {

        await addDoc(

            collection(
                db,
                "notifications"
            ),

            {

                userId:
                    order.userId,

                orderId:
                    order.id,

                type:
                    type,

                message:
                    message,

                read:
                    false,

                notificationRead:
                    false,

                createdAt:
                    serverTimestamp()

            }

        );


        console.log(
            "Notification created:",
            type,
            order.userId
        );

    }

    catch (error) {

        console.error(
            "Notification creation error:",
            error
        );

        throw error;

    }

}


// ======================================================
// LOAD ORDERS
// ======================================================

function loadOrders() {

    const ordersRef =
        collection(
            db,
            "orders"
        );


    let ordersQuery;


    try {

        ordersQuery =
            query(
                ordersRef,
                orderBy(
                    "createdAt",
                    "desc"
                )
            );

    }

    catch (error) {

        ordersQuery =
            ordersRef;

    }


    onSnapshot(

        ordersQuery,

        (snapshot) => {

            orders = [];


            snapshot.forEach(
                (docSnapshot) => {

                    orders.push({

                        id:
                            docSnapshot.id,

                        ...docSnapshot.data()

                    });

                }
            );


            console.log(
                "ORDERS LOADED:",
                orders
            );


            updateDashboard();

            updateOrdersTable();

            updateRecentOrders();

            updatePaymentsTable();

            updateProgramChart();

        },

        (error) => {

            console.error(
                "Error loading orders:",
                error
            );

        }

    );

}


// ======================================================
// LOAD USERS
// ======================================================

function loadUsers() {

    const usersRef =
        collection(
            db,
            "users"
        );


    onSnapshot(

        usersRef,

        (snapshot) => {

            users = [];


            snapshot.forEach(
                (docSnapshot) => {

                    users.push({

                        id:
                            docSnapshot.id,

                        ...docSnapshot.data()

                    });

                }
            );


            updateUsersTable();


            setText(
                "totalUsers",
                String(users.length)
                    .padStart(2, "0")
            );

        },

        (error) => {

            console.error(
                "Error loading users:",
                error
            );

        }

    );

}


// ======================================================
// LOAD PAYMENTS
// ======================================================

function loadPayments() {

    const paymentsRef =
        collection(
            db,
            "payments"
        );


    onSnapshot(

        paymentsRef,

        (snapshot) => {

            payments = [];


            snapshot.forEach(
                (docSnapshot) => {

                    payments.push({

                        id:
                            docSnapshot.id,

                        ...docSnapshot.data()

                    });

                }
            );


            console.log(
                "PAYMENTS LOADED:",
                payments
            );


            payments.forEach(payment => {

                console.log(
                    "PAYMENT DEBUG:",
                    {
                        id:
                            payment.id,

                        orderId:
                            payment.orderId,

                        orderNumber:
                            payment.orderNumber,

                        paymentMethod:
                            payment.paymentMethod,

                        referenceNumber:
                            payment.referenceNumber,

                        paymentReference:
                            payment.paymentReference,

                        referenceNo:
                            payment.referenceNo
                    }
                );

            });


            updateOrdersTable();

            updateRecentOrders();

            updatePaymentsTable();

        },

        (error) => {

            console.error(
                "Error loading payments:",
                error
            );

        }

    );

}


// ======================================================
// LOAD PRODUCTS
// ======================================================

function loadProducts() {

    const productsRef =
        collection(
            db,
            "products"
        );


    onSnapshot(

        productsRef,

        (snapshot) => {

            products = [];


            snapshot.forEach(
                (docSnapshot) => {

                    products.push({

                        id:
                            docSnapshot.id,

                        ...docSnapshot.data()

                    });

                }
            );


            console.log(
                "PRODUCTS LOADED:",
                products
            );


            updateProducts();

        },

        (error) => {

            console.error(
                "Error loading products:",
                error
            );

        }

    );

}


// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard() {

    const total =
        orders.length;


    const pending =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "pending"
        ).length;


    const confirmed =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "confirmed"
        ).length;


    const completed =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "completed"
        ).length;


    const cancelled =
        orders.filter(
            order => {

                const status =
                    normalizeStatus(
                        order.status
                    );


                return (

                    status === "cancelled" ||

                    status === "canceled"

                );

            }
        ).length;


    setText(
        "totalOrders",
        String(total).padStart(2, "0")
    );


    setText(
        "confirmedOrders",
        String(confirmed).padStart(2, "0")
    );


    setText(
        "cancelledOrders",
        String(cancelled).padStart(2, "0")
    );


    setText(
        "pendingOrders",
        pending
    );


    setText(
        "completedOrders",
        completed
    );


    setText(
        "chartTotalOrders",
        total
    );


    setText(
        "chartPendingOrders",
        pending
    );


    setText(
        "chartConfirmedOrders",
        confirmed
    );


    setText(
        "chartCancelledOrders",
        cancelled
    );


    setText(
        "chartCompletedOrders",
        completed
    );


    setText(
        "reportOrders",
        total
    );


    setText(
        "reportPendingOrders",
        pending
    );


    setText(
        "reportConfirmedOrders",
        confirmed
    );


    setText(
        "reportCancelledOrders",
        cancelled
    );


    setText(
        "reportCompletedOrders",
        completed
    );


    let profit = 0;


    orders.forEach(order => {

        if (
            normalizeStatus(
                order.status
            ) === "completed"
        ) {

            profit +=
                getOrderTotal(order);

        }

    });


    setText(
        "totalProfit",
        formatMoney(profit)
    );


    setText(
        "reportProfit",
        formatMoney(profit)
    );


    updateMonthlyGraph();

    updateProgramChart();

}


// ======================================================
// STATUS TEXT
// ======================================================

function getStatusText(status) {

    if (
        status === "cancelled" ||
        status === "canceled"
    ) {

        return "Cancelled";

    }


    if (
        status === "completed"
    ) {

        return "Completed";

    }


    if (
        status === "confirmed"
    ) {

        return "Confirmed";

    }


    return "Pending";

}


// ======================================================
// ORDERS TABLE
// ======================================================

function updateOrdersTable() {

    const table =
        document.getElementById(
            "ordersTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = "";


    let filteredOrders =
        [...orders];


    if (
        currentOrderFilter !== "all"
    ) {

        filteredOrders =
            filteredOrders.filter(
                order => {

                    const status =
                        normalizeStatus(
                            order.status
                        );


                    if (
                        currentOrderFilter ===
                        "cancelled"
                    ) {

                        return (

                            status === "cancelled" ||

                            status === "canceled"

                        );

                    }


                    return (
                        status ===
                        currentOrderFilter
                    );

                }
            );

    }


    if (currentSearch) {

        const search =
            currentSearch.toLowerCase();


        filteredOrders =
            filteredOrders.filter(
                order => {

                    const customer =
                        getCustomerName(
                            order
                        );


                    const program =
                        getOrderProgram(
                            order
                        );


                    const reference =
                        getReferenceNumber(
                            order
                        );


                    const id =
                        order.id || "";


                    return (

                        String(id)
                            .toLowerCase()
                            .includes(search) ||

                        String(customer)
                            .toLowerCase()
                            .includes(search) ||

                        String(program)
                            .toLowerCase()
                            .includes(search) ||

                        String(reference)
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );

    }


    if (
        filteredOrders.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="empty">

                    No orders found.

                </td>

            </tr>

        `;

        return;

    }


    filteredOrders.forEach(
        order => {

            const row =
                document.createElement(
                    "tr"
                );


            const total =
                getOrderTotal(
                    order
                );


            const customer =
                getCustomerName(
                    order
                );


            const program =
                getOrderProgram(
                    order
                );


            const reference =
                getReferenceNumber(
                    order
                );


            const quantity =
                Number(
                    order.quantity
                ) || 1;


            const status =
                normalizeStatus(
                    order.status
                );


            const statusText =
                getStatusText(
                    status
                );


            let actionButtons = `

                <button
                    type="button"
                    class="view-btn"
                    onclick="viewOrder('${escapeHTML(order.id)}')">

                    <i class="fa-solid fa-eye"></i>
                    View

                </button>

            `;


            if (
                status === "pending"
            ) {

                actionButtons += `

                    <button
                        type="button"
                        class="confirm-btn"
                        onclick="confirmOrder('${escapeHTML(order.id)}')">

                        <i class="fa-solid fa-check"></i>
                        Confirm

                    </button>


                    <button
                        type="button"
                        class="cancel-btn"
                        onclick="cancelOrder('${escapeHTML(order.id)}')">

                        <i class="fa-solid fa-xmark"></i>
                        Cancel

                    </button>

                `;

            }


            else if (
                status === "confirmed"
            ) {

                actionButtons += `

                    <button
                        type="button"
                        class="complete-btn"
                        onclick="completeOrder('${escapeHTML(order.id)}')">

                        <i class="fa-solid fa-check-double"></i>
                        Complete

                    </button>

                `;

            }


            else if (
                status === "completed"
            ) {

                actionButtons += `

                    <span class="status-completed">

                        <i class="fa-solid fa-circle-check"></i>
                        Completed

                    </span>

                `;

            }


            else if (
                status === "cancelled" ||
                status === "canceled"
            ) {

                actionButtons += `

                    <span class="status-cancelled">

                        <i class="fa-solid fa-circle-xmark"></i>
                        Cancelled

                    </span>

                `;

            }


            row.innerHTML = `

                <td>
                    ${escapeHTML(order.id)}
                </td>

                <td>
                    ${escapeHTML(reference)}
                </td>

                <td>
                    ${escapeHTML(customer)}
                </td>

                <td>
                    ${escapeHTML(program)}
                </td>

                <td>
                    ${quantity}
                </td>

                <td>
                    ${formatMoney(total)}
                </td>

                <td>

                    <span
                        class="status ${escapeHTML(status)}">

                        ${escapeHTML(statusText)}

                    </span>

                </td>

                <td class="order-actions">

                    ${actionButtons}

                </td>

            `;


            table.appendChild(row);

        }
    );

}


// ======================================================
// CONFIRM ORDER
// ======================================================

window.confirmOrder =
    async function(orderId) {

        const order =
            orders.find(
                order =>
                    order.id ===
                    orderId
            );


        if (!order) {

            alert(
                "Order not found."
            );

            return;

        }


        if (
            normalizeStatus(
                order.status
            ) !== "pending"
        ) {

            alert(
                "Only pending orders can be confirmed."
            );

            return;

        }


        const answer =
            confirm(
                "Are you sure you want to confirm this order?"
            );


        if (!answer) {

            return;

        }


        try {

            await updateDoc(

                doc(
                    db,
                    "orders",
                    orderId
                ),

                {

                    status:
                        "confirmed",

                    confirmedAt:
                        serverTimestamp()

                }

            );


            await createUserNotification(

                order,

                "order_confirmed",

                `Your Order ID ${orderId} has been confirmed by the admin.`

            );


            alert(
                "Order confirmed successfully!\n\nThe user has been notified."
            );

        }

        catch (error) {

            console.error(
                "Confirm order error:",
                error
            );


            alert(
                "Failed to confirm order.\n\n" +
                error.message
            );

        }

    };


// ======================================================
// CANCEL ORDER
// ======================================================

window.cancelOrder =
    async function(orderId) {

        const order =
            orders.find(
                order =>
                    order.id ===
                    orderId
            );


        if (!order) {

            alert(
                "Order not found."
            );

            return;

        }


        if (
            normalizeStatus(
                order.status
            ) !== "pending"
        ) {

            alert(
                "Only pending orders can be cancelled."
            );

            return;

        }


        const answer =
            confirm(
                "Are you sure you want to cancel this order?"
            );


        if (!answer) {

            return;

        }


        try {

            await updateDoc(

                doc(
                    db,
                    "orders",
                    orderId
                ),

                {

                    status:
                        "cancelled",

                    cancelledAt:
                        serverTimestamp(),

                    notification:
                        `Your Order ID ${orderId} has been cancelled by the admin.`,

                    notificationType:
                        "order_cancelled",

                    notificationRead:
                        false,

                    userNotified:
                        true

                }

            );


            await createUserNotification(

                order,

                "order_cancelled",

                `Your Order ID ${orderId} has been cancelled by the admin.`

            );


            alert(
                `Order ${orderId} has been cancelled.\n\nThe user has been notified.`
            );

        }

        catch (error) {

            console.error(
                "Cancel order error:",
                error
            );


            alert(
                "Failed to cancel order.\n\n" +
                error.message
            );

        }

    };


// ======================================================
// COMPLETE ORDER
// ======================================================

window.completeOrder =
    async function(orderId) {

        const order =
            orders.find(
                order =>
                    order.id ===
                    orderId
            );


        if (!order) {

            alert(
                "Order not found."
            );

            return;

        }


        if (
            normalizeStatus(
                order.status
            ) !== "confirmed"
        ) {

            alert(
                "Only confirmed orders can be completed."
            );

            return;

        }


        const answer =
            confirm(
                "Are you sure you want to mark this order as completed?"
            );


        if (!answer) {

            return;

        }


        try {

            await updateDoc(

                doc(
                    db,
                    "orders",
                    orderId
                ),

                {

                    status:
                        "completed",

                    completedAt:
                        serverTimestamp()

                }

            );


            await createUserNotification(

                order,

                "order_completed",

                `Your Order ID ${orderId} has been completed. Thank you for ordering from CASWear!`

            );


            alert(
                "Order completed successfully!\n\nThe user has been notified."
            );

        }

        catch (error) {

            console.error(
                "Complete order error:",
                error
            );


            alert(
                "Failed to complete order.\n\n" +
                error.message
            );

        }

    };


// ======================================================
// VIEW ORDER
// ======================================================

window.viewOrder =
    function(orderId) {

        const order =
            orders.find(
                order =>
                    order.id ===
                    orderId
            );


        if (!order) {

            alert(
                "Order not found."
            );

            return;

        }


        const customer =
            getCustomerName(
                order
            );


        const quantity =
            Number(
                order.quantity
            ) || 1;


        const status =
            normalizeStatus(
                order.status
            );


        const program =
            getOrderProgram(
                order
            );


        const reference =
            getReferenceNumber(
                order
            );


        const paymentMethod =
            getPaymentMethod(order) ||
            "N/A";


        const address =
            order.address ||
            order.deliveryAddress ||
            "N/A";


        const contact =
            order.contact ||
            order.phone ||
            order.phoneNumber ||
            "N/A";


        alert(`

ORDER DETAILS
==============================

Order ID:
${order.id}

Reference Number:
${reference}

Student Name:
${customer}

Program:
${program}

Quantity:
${quantity}

Amount:
${formatMoney(
    getOrderTotal(order)
)}

Payment Method:
${paymentMethod}

Contact:
${contact}

Address:
${address}

Status:
${getStatusText(status)}

Date:
${formatDate(
    order.createdAt
)}

==============================

`);

    };


// ======================================================
// ORDER FILTER
// ======================================================

window.filterOrders =
    function(
        filter,
        button
    ) {

        currentOrderFilter =
            filter;


        document
            .querySelectorAll(
                ".order-tab"
            )
            .forEach(
                tab => {

                    tab.classList.remove(
                        "active"
                    );

                }
            );


        if (button) {

            button.classList.add(
                "active"
            );

        }


        updateOrdersTable();

    };


// ======================================================
// RECENT ORDERS
// ======================================================

function updateRecentOrders() {

    const table =
        document.getElementById(
            "recentOrdersTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = "";


    const recent =

        [...orders]

            .sort(
                (a, b) => {

                    const dateA =
                        getDateObject(
                            a.createdAt
                        );

                    const dateB =
                        getDateObject(
                            b.createdAt
                        );


                    return (

                        (dateB?.getTime() || 0) -

                        (dateA?.getTime() || 0)

                    );

                }
            )

            .slice(0, 5);


    if (
        recent.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty">

                    No orders yet.

                </td>

            </tr>

        `;

        return;

    }


    recent.forEach(
        order => {

            const row =
                document.createElement(
                    "tr"
                );


            const customer =
                getCustomerName(
                    order
                );


            const program =
                getOrderProgram(
                    order
                );


            const status =
                normalizeStatus(
                    order.status
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        order.id
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        customer
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        program
                    )}
                </td>

                <td>
                    ${formatMoney(
                        getOrderTotal(
                            order
                        )
                    )}
                </td>

                <td>

                    <span
                        class="status ${escapeHTML(status)}">

                        ${escapeHTML(
                            getStatusText(
                                status
                            )
                        )}

                    </span>

                </td>

                <td>
                    ${formatDate(
                        order.createdAt
                    )}
                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// ======================================================
// USERS TABLE
// ======================================================

function updateUsersTable() {

    const table =
        document.getElementById(
            "usersTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = "";


    if (
        users.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty">

                    No users yet.

                </td>

            </tr>

        `;

        return;

    }


    users.forEach(
        user => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>

                    ${escapeHTML(

                        user.studentName ||

                        user.fullname ||

                        user.fullName ||

                        user.name ||

                        "N/A"

                    )}

                </td>


                <td>

                    ${escapeHTML(

                        user.email ||

                        "N/A"

                    )}

                </td>


                <td>

                    ${escapeHTML(

                        user.contact ||

                        user.phone ||

                        user.phoneNumber ||

                        "N/A"

                    )}

                </td>


                <td>

                    ${escapeHTML(

                        user.address ||

                        "N/A"

                    )}

                </td>


                <td>

                    ${escapeHTML(

                        user.role ||

                        "User"

                    )}

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// ======================================================
// PAYMENTS TABLE
// ======================================================

function updatePaymentsTable() {

    const table =
        document.getElementById(
            "paymentsTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = "";


    if (
        payments.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty">

                    No payments yet.

                </td>

            </tr>

        `;

        return;

    }


    payments.forEach(
        payment => {

            const row =
                document.createElement(
                    "tr"
                );


            const relatedOrder =
                findOrderForPayment(
                    payment
                );


            let paymentMethod =
                getPaymentDocumentMethod(
                    payment
                );


            if (
                !paymentMethod &&
                relatedOrder
            ) {

                paymentMethod =
                    getPaymentMethod(
                        relatedOrder
                    );

            }


            paymentMethod =
                paymentMethod ||
                "N/A";


            let isCash = false;

            let isOnline = false;


            if (
                isOnlinePaymentDocument(
                    payment
                )
            ) {

                isOnline = true;

            }


            else if (
                isCashPaymentDocument(
                    payment
                )
            ) {

                isCash = true;

            }


            else if (
                !getPaymentDocumentMethod(
                    payment
                ) &&
                relatedOrder
            ) {

                if (
                    isGcashPayment(
                        relatedOrder
                    )
                ) {

                    isOnline = true;

                }

                else if (
                    isCashPayment(
                        relatedOrder
                    )
                ) {

                    isCash = true;

                }

            }


            let reference =
                "N/A";


            if (isCash) {

                reference =
                    "N/A";

            }


            else if (isOnline) {

                reference =
                    getPaymentReference(
                        payment
                    );


                if (
                    !reference &&
                    relatedOrder
                ) {

                    reference =
                        getPaymentReference(
                            relatedOrder
                        );

                }


                if (!reference) {

                    reference =
                        "No reference number";

                }

            }


            else {

                const directReference =
                    getPaymentReference(
                        payment
                    );


                if (
                    directReference
                ) {

                    reference =
                        directReference;

                }

                else if (
                    relatedOrder
                ) {

                    reference =
                        getReferenceNumber(
                            relatedOrder
                        );

                }

                else {

                    reference =
                        "N/A";

                }

            }


            const orderNumber =

                payment.orderNumber ||

                payment.orderNo ||

                payment.orderId ||

                payment.orderID ||

                payment.order_id ||

                payment.reservationNumber ||

                payment.reservationNo ||

                payment.reservationId ||

                payment.reservationID ||

                relatedOrder?.orderNumber ||

                relatedOrder?.orderNo ||

                relatedOrder?.orderId ||

                relatedOrder?.orderID ||

                relatedOrder?.id ||

                "N/A";


            const paymentAmount =

                Number(

                    payment.total ??

                    payment.amount ??

                    payment.totalAmount ??

                    payment.amountPaid ??

                    payment.amountDue ??

                    relatedOrder?.total ??

                    relatedOrder?.amount ??

                    relatedOrder?.totalAmount ??

                    0

                ) || 0;


            const paymentStatus =

                payment.status ||

                payment.paymentStatus ||

                "Pending";


            row.innerHTML = `

                <td>

                    ${escapeHTML(
                        payment.id
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        orderNumber
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        reference
                    )}

                </td>


                <td>

                    ${formatMoney(
                        paymentAmount
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        paymentMethod
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        paymentStatus
                    )}

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// ======================================================
// MONTHLY ORDERS GRAPH
// ======================================================

function updateMonthlyGraph() {

    const groups =
        document.querySelectorAll(
            ".bar-group"
        );


    if (!groups.length) {

        return;

    }


    const monthlyOrders =
        new Array(12).fill(0);


    orders.forEach(
        order => {

            const date =
                getDateObject(
                    order.createdAt
                );


            if (!date) {

                return;

            }


            const month =
                date.getMonth();


            if (
                month >= 0 &&
                month <= 11
            ) {

                monthlyOrders[
                    month
                ]++;

            }

        }
    );


    const max =
        Math.max(
            ...monthlyOrders,
            1
        );


    groups.forEach(
        (group, index) => {

            const bar =
                group.querySelector(
                    ".order-bar"
                );


            if (!bar) {

                return;

            }


            const height =

                (
                    monthlyOrders[index] /
                    max
                ) * 100;


            bar.style.height =
                `${height}%`;

        }
    );

}


// ======================================================
// ORDERS BY PROGRAM
// ======================================================

function updateProgramChart() {

    const container =
        document.getElementById(
            "programChart"
        );


    const programCounts = {};


    orders.forEach(
        order => {

            const program =
                getOrderProgram(
                    order
                );


            if (
                !program ||
                program === "N/A"
            ) {

                return;

            }


            if (
                !programCounts[program]
            ) {

                programCounts[program] =
                    0;

            }


            programCounts[program]++;

        }
    );


    const entries =

        Object.entries(
            programCounts
        )

        .sort(
            (a, b) =>
                b[1] - a[1]
        );


    renderProgramChartGraph(
        entries
    );


    if (!container) {

        return;

    }


    if (
        entries.length === 0
    ) {

        container.innerHTML = `

            <div class="empty">

                No program orders yet.

            </div>

        `;

        return;

    }


    const max =

        Math.max(
            ...entries.map(
                item => item[1]
            ),
            1
        );


    container.innerHTML = "";


    entries.forEach(
        ([program, count]) => {

            const percentage =

                (
                    count /
                    max
                ) * 100;


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "program-chart-row";


            row.innerHTML = `

                <div
                    class="chart-row-top">

                    <span
                        class="chart-label">

                        ${escapeHTML(
                            program
                        )}

                    </span>


                    <strong>

                        ${count}

                    </strong>

                </div>


                <div
                    class="chart-track">

                    <div
                        class="chart-fill program-fill"
                        style="width:${percentage}%">

                    </div>

                </div>

            `;


            container.appendChild(
                row
            );

        }
    );

}


// ======================================================
// ORDERS BY PROGRAM — CHART.JS
// ======================================================

function renderProgramChartGraph(entries) {

    const canvas =
        document.getElementById(
            "programChartGraph"
        );


    if (!canvas) {

        return;

    }


    if (
        typeof Chart === "undefined"
    ) {

        return;

    }


    const labels =
        entries.map(
            ([program]) => program
        );


    const counts =
        entries.map(
            ([, count]) => count
        );


    if (programChartInstance) {

        programChartInstance.data.labels =
            labels;


        programChartInstance.data.datasets[0].data =
            counts;


        programChartInstance.update();

        return;

    }


    programChartInstance =
        new Chart(

            canvas,

            {

                type:
                    "bar",

                data: {

                    labels:
                        labels,

                    datasets: [

                        {

                            label:
                                "Orders",

                            data:
                                counts,

                            backgroundColor:
                                "#c9a227",

                            borderRadius:
                                6

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            display:
                                false

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                precision:
                                    0

                            }

                        }

                    }

                }

            }

        );

}


// ======================================================
// PRODUCTS
// ======================================================

function updateProducts() {

    const container =
        document.getElementById(
            "productsContainer"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (
        products.length === 0
    ) {

        container.innerHTML = `

            <div class="full-card">

                <div class="empty">

                    No products yet.

                </div>

            </div>

        `;

        return;

    }


    products.forEach(
        product => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            const name =

                product.name ||

                product.productName ||

                "Unnamed Product";


            const category =

                product.category ||

                "Others";


            // ==================================================
            // PRODUCT PROGRAM (now always a canonical code:
            // IS / IT / STAT / PSYCH / PROVINCIAL)
            // ==================================================

            const program =

                product.program ||

                product.programName ||

                "N/A";


            const price =

                Number(
                    product.price
                ) || 0;



            const image =

                product.image ||

                product.imageUrl ||

                product.photo ||

                "";


            card.innerHTML = `

                <div
                    class="product-image">

                    ${

                        image

                        ?

                        `

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(name)}">

                        `

                        :

                        `

                        <i
                            class="fa-solid fa-shirt">
                        </i>

                        `

                    }

                </div>


                <div
                    class="product-info">

                    <h3>
                        ${escapeHTML(name)}
                    </h3>


                    <p>
                        ${escapeHTML(category)}
                    </p>


                    <p>
                        Program:
                        ${escapeHTML(program)}
                    </p>


                    <strong>
                        ${formatMoney(price)}
                    </strong>




                    <button
                        type="button"
                        class="delete-product-btn"
                        onclick="deleteProduct('${escapeHTML(product.id)}')">

                        <i class="fa-solid fa-trash"></i>

                        Delete

                    </button>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}


// ======================================================
// DELETE PRODUCT
// ======================================================

window.deleteProduct =
    async function(productId) {

        const product =
            products.find(
                product =>
                    product.id ===
                    productId
            );


        if (!product) {

            alert(
                "Product not found."
            );

            return;

        }


        const productName =

            product.name ||

            product.productName ||

            "this product";


        const answer =
            confirm(

                `Are you sure you want to delete "${productName}"?`

            );


        if (!answer) {

            return;

        }


        try {

            await deleteDoc(

                doc(
                    db,
                    "products",
                    productId
                )

            );


            alert(

                `"${productName}" has been deleted successfully.`

            );

        }

        catch (error) {

            console.error(
                "Delete product error:",
                error
            );


            alert(

                "Failed to delete product.\n\n" +
                error.message

            );

        }

    };


// ======================================================
// PRODUCT MODAL
// ======================================================

window.openProductModal =
    function() {

        const modal =
            document.getElementById(
                "productModal"
            );


        if (modal) {

            modal.classList.add(
                "show"
            );

        }

    };


window.closeProductModal =
    function() {

        const modal =
            document.getElementById(
                "productModal"
            );


        if (modal) {

            modal.classList.remove(
                "show"
            );

        }

    };


// ======================================================
// SAVE PRODUCT
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const productForm =
            document.getElementById(
                "productForm"
            );


        if (!productForm) {

            return;

        }


        productForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const name =
                    document.getElementById(
                        "productName"
                    )?.value.trim();


                const category =
                    document.getElementById(
                        "productCategory"
                    )?.value;


                // ==================================================
                // GET PRODUCT PROGRAM AND NORMALIZE IT FOR STORAGE
                // This is the fix: whatever the <select> option's
                // raw value/text is, it gets forced into one of
                // IS / IT / STAT / PSYCH / PROVINCIAL before being
                // saved — matching exactly what products.js expects
                // when it filters products per storefront page.
                // ==================================================

                const rawProgram =
                    document.getElementById(
                        "productProgram"
                    )?.value;


                const program =
                    normalizeProgramForStorage(
                        rawProgram
                    );

                const price =
                    Number(
                        document.getElementById(
                            "productPrice"
                        )?.value
                    ) || 0;



                const image =
                    document.getElementById(
                        "productImage"
                    )?.value.trim();


                if (!name) {

                    alert(
                        "Please enter a product name."
                    );

                    return;

                }


                if (!category) {

                    alert(
                        "Please select a category."
                    );

                    return;

                }


                if (!rawProgram) {

                    alert(
                        "Please select a program."
                    );

                    return;

                }


                // ==================================================
                // WARN IF THE PROGRAM COULDN'T BE NORMALIZED
                // (shouldn't happen if the <select> options match
                // one of the canonical values/labels, but this
                // catches typos or a newly added option that was
                // never added to normalizeProgramForStorage()).
                // ==================================================

                const knownPrograms = [
                    "IS", "IT", "STAT", "PSYCH", "PROVINCIAL"
                ];

                if (!knownPrograms.includes(program)) {

                    const proceed = confirm(

                        `Warning: the program value "${rawProgram}" ` +
                        `did not match a known program (IS, IT, STAT, ` +
                        `PSYCH, PROVINCIAL).\n\nThis product will be ` +
                        `saved with program = "${program}" and will ` +
                        `NOT show up on any storefront page until this ` +
                        `is fixed.\n\nSave anyway?`

                    );

                    if (!proceed) {

                        return;

                    }

                }


                if (price < 0) {

                    alert(
                        "Price cannot be negative."
                    );

                    return;

                }

                try {

                    const productData = {

                        name:
                            name,

                        category:
                            category,

                        program:
                            program,

                        price:
                            price,

                        image:
                            image,

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    };


                    const productRef =
                        await addDoc(

                            collection(
                                db,
                                "products"
                            ),

                            productData

                        );


                    console.log(
                        "PRODUCT ADDED:",
                        productRef.id
                    );


                    console.log(
                        "PRODUCT PROGRAM (raw):",
                        rawProgram,
                        "-> (normalized):",
                        program
                    );


                    alert(
                        "Product added successfully!"
                    );


                    productForm.reset();


                    closeProductModal();

                }

                catch (error) {

                    console.error(
                        "Add product error:",
                        error
                    );


                    alert(

                        "Failed to add product.\n\n" +
                        error.message

                    );

                }

            }
        );

    }
);


// ======================================================
// SEARCH
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const searchInput =
            document.getElementById(
                "searchInput"
            );


        if (!searchInput) {

            return;

        }


        searchInput.addEventListener(
            "input",
            (event) => {

                currentSearch =
                    event.target.value.trim();


                updateOrdersTable();

            }
        );

    }
);


// ======================================================
// SHOW SECTION
// ======================================================

window.showSection =
    function(
        sectionId,
        element
    ) {

        document
            .querySelectorAll(
                ".content-section"
            )
            .forEach(
                section => {

                    section.classList.remove(
                        "active-section"
                    );

                }
            );


        const section =
            document.getElementById(
                sectionId
            );


        if (section) {

            section.classList.add(
                "active-section"
            );

        }


        document
            .querySelectorAll(
                ".menu-link"
            )
            .forEach(
                link => {

                    link.classList.remove(
                        "active"
                    );

                }
            );


        if (element) {

            element.classList.add(
                "active"
            );

        }


        const title =
            document.getElementById(
                "pageHeaderTitle"
            );


        const titles = {

            dashboard:
                "Dashboard Overview",

            orders:
                "Orders Management",

            products:
                "Products Management",

            users:
                "Users Management",

            reports:
                "Reports",

            settings:
                "Settings"

        };


        if (title) {

            title.textContent =
                titles[sectionId] ||
                "CASWear Admin Dashboard";

        }


        if (
            sectionId ===
            "dashboard"
        ) {

            updateDashboard();

        }

    };


// ======================================================
// SHOW SECTION BY NAME
// ======================================================

window.showSectionByName =
    function(sectionId) {

        const links =
            document.querySelectorAll(
                ".menu-link"
            );


        let selectedLink =
            null;


        links.forEach(
            link => {

                const onclick =
                    link.getAttribute(
                        "onclick"
                    ) || "";


                if (
                    onclick.includes(
                        `'${sectionId}'`
                    )
                ) {

                    selectedLink =
                        link;

                }

            }
        );


        showSection(
            sectionId,
            selectedLink
        );

    };


// ======================================================
// LOGOUT
// ======================================================

async function logoutAdmin() {

    try {

        console.log(
            "Logging out admin..."
        );


        await signOut(auth);


        console.log(
            "Admin successfully logged out."
        );


        window.location.replace(
            "admin-login.html"
        );

    }

    catch (error) {

        console.error(
            "Logout error:",
            error
        );


        alert(
            "Logout failed.\n\n" +
            error.message
        );

    }

}


// ======================================================
// LOGOUT BUTTON
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        if (!logoutButton) {

            return;

        }


        logoutButton.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();


                logoutButton.disabled =
                    true;


                logoutButton.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    Logging out...

                `;


                await logoutAdmin();

            }
        );

    }
);


// ======================================================
// CURRENT DATE
// ======================================================

function updateCurrentDate() {

    const currentDate =
        document.getElementById(
            "currentDate"
        );


    if (!currentDate) {

        return;

    }


    currentDate.textContent =

        new Date().toLocaleDateString(
            "en-PH",
            {
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );

}


// ======================================================
// CLOSE MODAL OUTSIDE
// ======================================================

window.addEventListener(
    "click",
    (event) => {

        const modal =
            document.getElementById(
                "productModal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeProductModal();

        }

    }
);


updateCurrentDate();
loadOrders();
loadUsers();
loadPayments();
loadProducts();