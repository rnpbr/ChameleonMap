# Chameleon Map Architecture & Request Workflow

This document outlines the high-level architecture and request processing workflow for the Chameleon Map application.

## Architecture Diagram

![Chameleon Map Architecture](images/arquitetura.png)

## Core Components

* **Front-End**: The user-facing interface that receives the initial URL requests and renders the map.
* **Back-End**: The core application server responsible for business logic, processing front-end requests, managing database connections, and handling external data imports.
* **Database (PostgreSQL / SGBD)**: The relational database management system that stores map data. It uses a schema-based isolation model to segregate data when necessary.
* **External Imports**: Modules managed by the Back-End to ingest data from third-party systems and external files.

## Request Workflow

When a user accesses a map URL, the system processes the request through the following sequence:

1. **URL Access**: The user accesses a specific map via its URL (`1.com`, `2.com`, ..., `n.com`).
2. **Front-End Intercept**: The Front-End receives the request and extracts the identifying information (map context) from the URL.
3. **Back-End Query**: The Front-End makes an API call to the Back-End, requesting the specific data and configuration for that targeted URL.
4. **Database Routing (Schema Selection)**: The Back-End connects to the PostgreSQL database. The routing logic depends entirely on the deployment mode:
    * **Multitenant Mode**: The database contains multiple schemas (`Schema 1`, `Schema 2`, ..., `Schema n`). The URL information passed from the Front-End explicitly dictates which schema the Back-End must query to retrieve the correct map's data.
    * **Standalone Mode**: The database operates with only a single, default schema. The Back-End automatically queries this schema for all map requests.
5. **Data Delivery**: The Back-End retrieves the information from the selected schema and returns it to the Front-End for final rendering.
