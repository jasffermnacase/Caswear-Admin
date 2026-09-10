// =========================================================
// FIREBASE
// =========================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// =========================================================
// FIREBASE CONFIG
// =========================================================

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


// =========================================================
// INITIALIZE FIREBASE
// =========================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// =========================================================
// GET ELEMENTS
// =========================================================

const loginForm =
    document.getElementById("adminLoginForm");

const emailInput =
    document.getElementById("adminEmail");

const passwordInput =
    document.getElementById("adminPassword");

const loginMessage =
    document.getElementById("loginMessage");

const togglePassword =
    document.getElementById("togglePassword");


// =========================================================
// PASSWORD SHOW / HIDE
// =========================================================

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.classList.remove(
            "fa-eye"
        );

        togglePassword.classList.add(
            "fa-eye-slash"
        );

    } else {

        passwordInput.type = "password";

        togglePassword.classList.remove(
            "fa-eye-slash"
        );

        togglePassword.classList.add(
            "fa-eye"
        );

    }

});


// =========================================================
// ADMIN LOGIN
// =========================================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        // Clear message

        loginMessage.textContent = "";

        loginMessage.className =
            "login-message";


        // =================================================
        // VALIDATION
        // =================================================

        if (!email || !password) {

            loginMessage.textContent =
                "Please enter your email and password.";

            loginMessage.classList.add(
                "error"
            );

            return;
        }


        // =================================================
        // DISABLE BUTTON
        // =================================================

        const loginButton =
            loginForm.querySelector(
                ".admin-login-btn"
            );


        loginButton.disabled = true;

        loginButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';


        try {

            // =================================================
            // FIREBASE AUTHENTICATION
            // =================================================

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            console.log(
                "Authentication successful:",
                user.uid
            );


            // =================================================
            // CHECK ADMIN ROLE
            // =================================================

            const adminRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const adminSnapshot =
                await getDoc(adminRef);


            if (!adminSnapshot.exists()) {

                await auth.signOut();

                throw new Error(
                    "ADMIN_DOCUMENT_NOT_FOUND"
                );
            }


            const adminData =
                adminSnapshot.data();


            console.log(
                "Admin data:",
                adminData
            );


            // =================================================
            // VERIFY ROLE
            // =================================================

            if (adminData.role !== "admin") {

                await auth.signOut();

                throw new Error(
                    "NOT_ADMIN"
                );
            }


            // =================================================
            // LOGIN SUCCESS
            // =================================================

            loginMessage.textContent =
                "Login successful!";

            loginMessage.classList.add(
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "admin-dashboard.html";

            }, 700);


        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );


            let message =
                "Unable to log in.";


            // =================================================
            // ERROR MESSAGES
            // =================================================

            if (
                error.message ===
                "ADMIN_DOCUMENT_NOT_FOUND"
            ) {

                message =
                    "Admin account information was not found.";

            }

            else if (
                error.message ===
                "NOT_ADMIN"
            ) {

                message =
                    "This account does not have admin access.";

            }

            else if (
                error.code ===
                "auth/invalid-credential"
            ) {

                message =
                    "Invalid admin email or password.";

            }

            else if (
                error.code ===
                "auth/user-not-found"
            ) {

                message =
                    "No account was found with this email.";

            }

            else if (
                error.code ===
                "auth/wrong-password"
            ) {

                message =
                    "Incorrect password.";

            }

            else if (
                error.code ===
                "auth/invalid-email"
            ) {

                message =
                    "Please enter a valid email address.";

            }

            else if (
                error.code ===
                "auth/too-many-requests"
            ) {

                message =
                    "Too many login attempts. Try again later.";

            }

            else if (
                error.code ===
                "auth/network-request-failed"
            ) {

                message =
                    "Network error. Check your internet connection.";

            }

            else if (
                error.code ===
                "permission-denied"
            ) {

                message =
                    "You do not have permission to access the admin account.";

            }

            else {

                console.error(
                    "Unknown error:",
                    error.message
                );

                message =
                    error.message;
            }


            loginMessage.textContent =
                message;

            loginMessage.classList.add(
                "error"
            );


            // Enable button

            loginButton.disabled = false;

            loginButton.innerHTML =
                '<i class="fa-solid fa-right-to-bracket"></i> Login';

        }

    }
);