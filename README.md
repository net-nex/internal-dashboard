
# NetworkingNexus Internal Platform

Welcome to the internal project management and collaboration platform for the **NetworkingNexus** student club. This application is designed to streamline task management, improve team communication, and provide a centralized hub for all club-related activities.

## Tech Stack

This project is built with a modern, robust technology stack:

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **UI:** [ShadCN UI](https://ui.shadcn.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **Generative AI:** [Google Gemini via Genkit](https://firebase.google.com/docs/genkit)
- **Database & Storage:** [Firebase Firestore & Cloud Storage](https://firebase.google.com/)
- **Email Service:** [Resend](https://resend.com/)

## Getting Started

To get the application running locally, follow these steps:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables:**
    Create a `.env.local` file in the root of the project and add your Firebase and Resend API keys.

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:9002`.

## Key Features

- **Dashboard:** A central overview of tasks, recent activity, and key metrics.
- **Task Management:** Create, assign, and track tasks with deadlines, progress bars, and comments.
- **Team Hierarchy:** View the organizational structure of the club.
- **AI-Powered Assistance:** Generate task descriptions automatically using AI.
- **Real-time Updates:** Built on Firebase for live data synchronization.