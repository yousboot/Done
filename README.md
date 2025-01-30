# Done

Done is a minimalist and functional to-do list application that allows users to manage their tasks efficiently. Built using modern web technologies, this app provides a user-friendly interface to add, update, delete, and organize tasks.

![Alt text](https://i.ibb.co/mTNBbZF/screenshot.png)


## Features

- **Add, Edit, and Delete Tasks:** Users can easily manage their tasks by adding new tasks, editing existing ones, or deleting tasks they no longer need.

- **Drag-and-Drop Reordering:** Tasks can be reordered using a simple drag-and-drop interface.

- **Copy Tasks to Clipboard:** Copy a list of tasks to the clipboard in a formatted manner.

- **Priority and Status Management:** Assign priority levels (Low, Medium, High) and status (To be done, In progress, Done) to tasks for better organization.

- **Sort and Filter Tasks:** Sort tasks by position, date created, due date, or priority. Filter tasks by their status.

## Tech Stack

- **Frontend:** React, Tailwind CSS, Axios, react-beautiful-dnd
- **Backend:** Node.js, Express.js, SQLite
- **Database:** SQLite

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js
- npm (Node Package Manager)

### Installation

1. **Initial Setup :**

```bash
git clone https://github.com/yousbot/Done.git
cd Done
npm run setup
```

This will start the server as well. Once set up the first time, you can launch it through :

```bash
cd Done
npm start
```

### Usage

1. **Adding a Task:**

   - Click the "+" button to add a new task.
   - Fill in the task title, description, due date, priority, and status.
   - Click "Add Task" to save.

2. **Editing a Task:**
   - Click the "Edit" button next to a task to modify its details.
   - Update the information and click "Update Task" to save changes.
3. **Deleting a Task:**

   - Click the "Delete" button next to a task.
   - Confirm the deletion in the pop-up modal.

4. **Reordering Tasks:**

   - Drag and drop tasks to reorder them.

5. **Filtering and Sorting:**

   - Use the status buttons to filter tasks by their status.
   - Use the sort dropdown to sort tasks by position, date created, due date, or priority.

6. **Clearing All Tasks ( In progress ...) :**

   - Click the "Clear All" button (with the delete icon) to remove all tasks from the list.
   - Confirm the action in the pop-up modal.

7. **Copying Tasks to Clipboard:**

   - Click the "Copy" button to copy all tasks to the clipboard in a formatted text.

8. **Toggle Dark Mode ( In progress ...):**

   - Use the dark mode toggle to switch between light and dark themes.

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and make changes as you'd like. Pull requests will be reviewed and merged when appropriate.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Node.js](https://nodejs.org/)
- [SQLite](https://www.sqlite.org/index.html)

## Contact

For any inquiries, feel free to reach out:

- **Author:** Youssef Sbai Idrissi
- **GitHub:** @yousbot
