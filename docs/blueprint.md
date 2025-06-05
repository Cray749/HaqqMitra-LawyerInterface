# **App Name**: Case Companion

## Core Features:

- Spaces Management: Collapsible left sidebar for organizing and navigating 'Spaces' (cases/threads). Allows users to add new spaces via a modal or prompt. Reflects selected space in the main content area.
- New Thread/Case Reset: A prominent button that clears all input fields, uploaded files, ML output placeholders, and chat history, providing a fresh start for a new case or thread.
- Case Details Input Form: A form for entering case details, including title, court/tribunal, jurisdiction, case type, parties, description, and key dates. Includes a 'Submit' button to trigger ML predictions (simulated).
- Document Upload Panel: A dedicated area for uploading case-related documents (PDF, DOCX, images) via drag-and-drop or file selection, with a list of uploaded files and remove options.
- ML Prediction Output (Simulated): Simulates machine learning predictions based on input data. Displays estimated cost, expected duration, weak points, PowerPoint outline, and win/loss probability. Uses a loading spinner while simulating network delay.
- Chatbot Widget: A chatbot widget for interactive Q&A, featuring user and bot message bubbles. The bot response is simulated. Includes a 'Send' button and input field, and stores conversations in the history panel.
- Chat History Storage: A history panel to display timestamped previews of previous chatbot conversations. Clicking a preview expands to show the full Q&A. Includes a button to clear history.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and reliability.
- Background color: Light gray (#F0F2F5), creating a neutral and clean canvas.
- Accent color: Teal (#009688) used for interactive elements to highlight important actions. Note: requested by user
- Body font: 'Inter' sans-serif, for a modern, objective, and neutral feel.
- Headline font: 'Space Grotesk' sans-serif, to complement 'Inter' and create a contemporary scientific style
- Crisp, professional icons for key actions and navigation elements.
- Responsive design adapts to desktop (sidebar, main panel, chatbot/history side-by-side), tablet (collapsible sidebar, chatbot under main), and mobile (single column, stacking).
- Subtle animations for loading states, transitions, and user interactions, such as the loading spinner and expanding history items.