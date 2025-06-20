# 🍲 Food Tracker – Reducing Food Waste with Code

![MIT License](https://img.shields.io/github/license/michu1810/fastapi-foodtracker?style=flat-square)
![Tests](https://github.com/michu1810/fastapi-foodtracker/actions/workflows/tests.yml/badge.svg?style=flat-square)
[![codecov](https://codecov.io/gh/michu1810/fastapi-foodtracker/branch/main/graph/badge.svg?token=87SFXHBP46)](https://codecov.io/gh/michu1810/fastapi-foodtracker)

![Python](https://img.shields.io/badge/python-3.13-blue?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?style=flat-square)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red?style=flat-square)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat-square&logo=docker&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=flat-square&logo=postgresql&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37782A?style=flat-square&logo=celery&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat-square&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white)
![Pytest](https://img.shields.io/badge/pytest-✓-green?style=flat-square)

Food Tracker is a full-stack web application designed and built from the ground up to help users reduce food waste, manage their home pantry, and save money.

<p align="center">
  <a href="https://fastapi-foodtracker.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/Launch%20Live%20Demo-007ACC?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"/>
  </a>
</p>

---

### 🖼️ Application Gallery

| Login & Registration | Main Dashboard | Statistics | Achievements |
| :---: | :---: | :---: | :---: |
| ![Login Page](https://imgur.com/FF3zlVz.png) | ![Main Dashboard](https://imgur.com/3ciOqZF.png) | ![Statistics Page](https://imgur.com/xAzbQE2.png) | ![Achievements Page](https://imgur.com/JnkB6KY.png) |

---

### 🌟 Key Features

* **Full User Lifecycle:** Secure user registration with email verification, password/social login (Google & GitHub), and comprehensive account management.
* **Modern Authentication:** JWT-based system with `access` and `refresh` tokens, stored securely in `HttpOnly` cookies.
* **Product Management (CRUD):** Full control over the home pantry with smart expiration date suggestions for fresh, unlabeled products.
* **External API Integration:** Product search functionality that connects to a third-party API to fetch and suggest product details.
* **Automated Notifications:** Daily, asynchronous email notifications for expiring products, powered by **Celery Beat** and background workers.
* **Data Analytics & Gamification:** Financial statistics, data visualization charts with proper timezone handling, and an achievement system to boost user engagement.
* **Modern & Responsive UI:** A **Mobile-First** design approach ensures the application is fully functional and beautiful on any device.

### 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Backend** | Python 3.13, FastAPI (Async), PostgreSQL, SQLAlchemy 2.0 (Async), Celery, Pydantic |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion |
| **Database** | PostgreSQL, Redis (for Celery), Alembic (for migrations) |
| **Testing** | Pytest, Pytest-asyncio, HTTPX, Codecov |
| **DevOps** | Docker, Docker Compose, GitHub Actions (CI/CD) |
| **Services** | OAuth2 (Google & GitHub), JWT, Bcrypt, Cloudinary, Ruff |

---

### 🚀 Running Locally

The entire project is containerized, allowing for a one-command setup.

#### Prerequisites
* [Git](https://git-scm.com/)
* [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

#### Steps
1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/michu1810/fastapi-foodtracker.git](https://github.com/michu1810/fastapi-foodtracker.git)
    cd fastapi-foodtracker
    ```

2.  **Configure environment variables:**
    Create `.env` files in the `foodtracker/` and `frontend/` directories based on the `.env.example` files found there. Fill them with the required keys (e.g., for OAuth2, database, Cloudinary).

3.  **Build and run the application:**
    ```bash
    docker-compose up --build
    ```

4.  **Ready to Go! The application is available at:**
    * 🚀 **Frontend:** `http://localhost:5173`
    * 📚 **API Documentation (Swagger UI):** `http://localhost:8000/docs`

---

### <details><summary>🎯 Project Mission (Click to expand)</summary>

Every year, millions of tons of food are wasted. In Poland alone, this figure is close to 5 million tons. We throw food away because we forget about expiration dates, buy too much, or plan poorly. I decided to leverage my technical skills to create a tool that actively helps combat this ubiquitous problem at the individual level.

**Food Tracker** is my answer to this challenge. It is a fully functional web application that I designed and built from scratch to give users a simple and effective way to manage their home pantry, save money, and care for our planet. This repository is not just code—it's a demonstration of my approach to building complex, secure, and efficient full-stack systems.
</details>

### <details><summary>🛡️ Backend Architecture - A Deep Dive (Click to expand)</summary>

When designing the backend architecture, I set several key goals: **security, performance, and scalability**. Below are the most important technical decisions I made to achieve them:

-   **API Design (FastAPI):** I chose the asynchronous framework **FastAPI** to ensure extremely high performance and low latency, even under heavy load. I utilized the built-in **Dependency Injection** system to manage database sessions and user authentication.

-   **Authentication and Security:** I implemented authentication based on **JWTs**. The long-lived `refresh_token` is stored in a secure **`HttpOnly` cookie**, which is an industry standard for protection against **XSS** attacks. User passwords are protected with the strong, adaptive **bcrypt** algorithm.

-   **API Rate Limiting:** Implemented request throttling using **`slowapi`** to protect endpoints against brute-force attacks and denial-of-service (DoS) attempts, enhancing application security and stability.

-   **Asynchronous Background Tasks (Celery):** Sending emails and periodically checking expiration dates are delegated to **Celery** asynchronous tasks. This ensures the API remains responsive at all times. **Celery Beat** acts as a built-in scheduler, guaranteeing the automation of key processes.

-   **Database (PostgreSQL & SQLAlchemy):** I opted for a fully **asynchronous database stack** with `asyncpg` and `AsyncSession` in SQLAlchemy. To manage database schema changes, I used **Alembic**, which provides versioning and ensures safe migrations. Financial values are stored using the precise **`Decimal`** type to avoid rounding errors.

-   **Containerization (Docker):** The entire application is containerized using **Docker**, with separate, optimized configurations for development (`docker-compose.yml`) and production (`docker-compose.prod.yml`). For enhanced security, the processes inside the containers run as a **non-root user**.

-   **Secure File Storage (Cloudinary):** User avatars are validated on the backend by their **MIME type** (using `python-magic`) before being uploaded to **Cloudinary**, an external, scalable object storage service. This offloads the application server and ensures fast, secure media delivery.
</details>

### <details><summary>🧪 Automated Testing - A Solid Foundation (Click to expand)</summary>

-   **Code Quality & Linting:** The entire codebase is formatted and validated using **Ruff**, the state-of-the-art Python linter and formatter. This ensures high code quality, consistency, and adherence to best practices across the project.
-   **Code Coverage:** I aim for the highest possible code coverage (currently around 85-90%), with a strong focus on achieving 100% coverage for critical modules like authentication.
-   **Framework:** The entire test suite is based on **Pytest**, leveraging its advanced features like fixtures and parametrization.
-   **Test Types:**
    -   **Unit tests** for business logic (e.g., the achievement system, helper functions).
    -   **Integration tests** for the API, using an isolated, in-memory SQLite database for speed and reliability.
    -   **Mocking** of external and asynchronous services (e.g., email dispatch, Cloudinary API, Celery tasks).
-   **Automation (CI/CD):** A process using **GitHub Actions** automatically runs the linter (`ruff check`) and the entire test suite after every commit, ensuring constant quality control and measuring code coverage with **Codecov**.

This comprehensive testing approach allows me to develop the application quickly and safely, confident that its foundations are solid and reliable.
</details>

---

### 👤 Author

Crafted with passion from A to Z by **Michał Jamros**.

<p align="center">
    <a href="https://github.com/michu1810" target="_blank">
        <img src="https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
    </a>
    <a href="https://www.linkedin.com/in/michal-jamros/" target="_blank">
        <img src="https://img.shields.io/badge/linkedin-%230077B5.svg?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
    </a>
</p>
