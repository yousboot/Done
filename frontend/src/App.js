// frontend/src/App.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import { StrictModeDroppable } from "./StrictModeDroppable";

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    date_to_end: "",
    priority: "medium",
    status: "to be done",
  });
  const [editingTodo, setEditingTodo] = useState(null);
  const [sortBy, setSortBy] = useState("position");
  const [filterStatus, setFilterStatus] = useState("all");
  const [serverPort, setServerPort] = useState(5001);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  const audioRef = useRef(null);
  const startAudioHandler = useRef(() => {
    if (audioRef.current) {
      audioRef.current.muted = false;
    }
  });

  window.addEventListener("error", function (event) {
    if (
      event.message.includes("coordinate.x") &&
      event.filename.includes("content-script.js")
    ) {
      event.preventDefault(); // Prevent the error from being logged
    }
  });

  useEffect(() => {
    window.addEventListener("touchstart", startAudioHandler.current);
    return () => {
      window.removeEventListener("touchstart", startAudioHandler.current);
    };
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((error) => console.error("Error playing sound:", error));
    }
  };

  const fetchTodos = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:${serverPort}/todos?sort=${sortBy}&status=${filterStatus}`
      );
      const todosWithShowMore = response.data.map((todo) => ({
        ...todo,
        showMore: false, // Initialize showMore property
      }));
      setTodos(todosWithShowMore);
    } catch (error) {
      console.error("Error fetching todos:", error);
    }
  }, [serverPort, sortBy, filterStatus]);

  const toggleShowMore = (id) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, showMore: !todo.showMore } : todo
    );
    setTodos(updatedTodos);
  };

  useEffect(() => {
    fetch("http://localhost:5001/api/port")
      .then((response) => response.json())
      .then((data) => setServerPort(data.port))
      .catch((error) => console.error("Error fetching server port:", error));
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleComplete = async (todo) => {
    const updatedTodo = { ...todo, status: "done" };
    try {
      await axios.put(
        `http://localhost:${serverPort}/todos/${todo.id}`,
        updatedTodo
      );
      playSound();

      // Remove the completed todo from its current position
      const updatedTodos = todos.filter((t) => t.id !== todo.id);
      // Add it to the end of the list
      updatedTodos.push(updatedTodo);

      setTodos(updatedTodos);
    } catch (error) {
      console.error("Error completing todo:", error);
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "low":
        return "Can Wait";
      case "medium":
        return "Important";
      case "high":
        return "Urgent";
      default:
        return priority;
    }
  };

  const getPriorityValue = (label) => {
    switch (label) {
      case "Can Wait":
        return "low";
      case "Important":
        return "medium";
      case "Urgent":
        return "high";
      default:
        return label;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingTodo) {
      setEditingTodo({
        ...editingTodo,
        [name]: name === "priority" ? getPriorityValue(value) : value,
      });
    } else {
      setNewTodo({
        ...newTodo,
        [name]: name === "priority" ? getPriorityValue(value) : value,
      });
    }
  };

  const copyTasksToClipboard = () => {
    const tasksToInclude = todos.filter(
      (todo) => todo.status === "to be done" || todo.status === "in progress"
    );

    const formattedTasks = tasksToInclude
      .map(
        (todo) =>
          `[ ${todo.status.toUpperCase()} ] - [ ${
            todo.title
          } ] - [ ${getPriorityLabel(todo.priority).toUpperCase()} ]`
      )
      .join("\n");

    navigator.clipboard.writeText(formattedTasks).then(
      () => {
        alert("Tasks copied to clipboard!");
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingTodo) {
      await axios.put(
        `http://localhost:${serverPort}/todos/${editingTodo.id}`,
        editingTodo
      );
      setEditingTodo(null);
    } else {
      await axios.post(`http://localhost:${serverPort}/todos`, newTodo);
    }
    setIsAddModalOpen(false);
    setNewTodo({
      title: "",
      description: "",
      date_to_end: "",
      priority: "medium",
      status: "to be done",
    });
    fetchTodos();
  };

  const handleDelete = async (id) => {
    setTodoToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    await axios.delete(`http://localhost:${serverPort}/todos/${todoToDelete}`);
    setIsDeleteModalOpen(false);
    fetchTodos();
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setIsAddModalOpen(true);
  };

  const handleSort = (e) => {
    setSortBy(e.target.value);
  };

  const handleFilter = (e) => {
    setFilterStatus(e.target.value);
  };

  const onDragEnd = useCallback(
    async (result) => {
      if (!result.destination) return;

      const items = Array.from(todos);
      const [reorderedItem] = items.splice(result.source.index, 1);

      // Check for undefined or invalid values
      if (!reorderedItem || !result.destination) {
        console.error("Invalid drag result:", result);
        return;
      }

      items.splice(result.destination.index, 0, reorderedItem);

      setTodos(items);

      try {
        await axios.post(`http://localhost:${serverPort}/todos/reorder`, {
          todoId: result.draggableId,
          newPosition: result.destination.index,
        });
      } catch (error) {
        console.error("Error updating todo order:", error);
        fetchTodos();
      }
    },
    [todos, serverPort, fetchTodos]
  );

  const calculateDaysLeft = (dueDate) => {
    const currentDate = new Date();
    const targetDate = new Date(dueDate);
    const timeDifference = targetDate - currentDate;
    const daysLeft = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
    return daysLeft;
  };

  const formatDueDate = (dueDate) => {
    const options = { day: "numeric", month: "long", year: "numeric" };
    return new Date(dueDate).toLocaleDateString(undefined, options);
  };

  const handleClearAll = async () => {
    try {
      await axios.delete(`http://localhost:${serverPort}/todos`);
      fetchTodos(); // Refreshing the list after clearing all tasks
    } catch (error) {
      console.error("Error clearing all todos:", error);
    }
  };

  return (
    <div className="flex bg-white justify-center py-8 min-h-screen">
      <audio ref={audioRef} src="/complete.mp3"></audio>

      <div className="App  max-w-5xl w-full p-8 ">
        {" "}
        <h1 className="text-3xl font-biro mb-6  text-gray-700">(v) Done</h1>
        <div className="controls flex pt-6 justify-between mb-4 items-center">
          {/* Sorting Dropdown */}
          {/* <div className="relative dropdown">
            <button
              className="dropdown-toggle px-4 py-2 bg-gray-200 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() =>
                document
                  .getElementById("sortDropdown")
                  .classList.toggle("hidden")
              }
            >
              Sort Options
              <i className="ki-outline ki-down ml-2 dropdown-open:hidden"></i>
              <i className="ki-outline ki-up ml-2 hidden dropdown-open:block"></i>
            </button>
            <div
              id="sortDropdown"
              className="dropdown-content absolute bg-white shadow-lg rounded-lg mt-2 hidden"
            >
              <ul className="w-full max-w-56 p-4">
                <li>
                  <button
                    onClick={() =>
                      handleSort({ target: { value: "position" } })
                    }
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    Sort by Position
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      handleSort({ target: { value: "created_at" } })
                    }
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    Sort by Date Created
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      handleSort({ target: { value: "date_to_end" } })
                    }
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    Sort by Due Date
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      handleSort({ target: { value: "priority" } })
                    }
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    Sort by Priority
                  </button>
                </li>
              </ul>
            </div>
          </div> */}

          {/* Status Filters */}
          <div className="status-filters flex space-x-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                filterStatus === "all"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-200 text-gray-700"
              } hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-700`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus("to be done")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                filterStatus === "to be done"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-200 text-gray-700"
              } hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-700`}
            >
              To be done
            </button>
            <button
              onClick={() => setFilterStatus("in progress")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                filterStatus === "in progress"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-200 text-gray-700"
              } hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-700`}
            >
              In progress
            </button>
            <button
              onClick={() => setFilterStatus("done")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                filterStatus === "done"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-200 text-gray-700"
              } hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-700`}
            >
              Done
            </button>
          </div>

          <div className=" flex flex-row py-4 gap-2 justify-end items-end">
            <button
              onClick={copyTasksToClipboard}
              className="p-3 bg-gray-300 text-gray-400 rounded-full hover:bg-gray-500 hover:text-gray-100"
              title="Copy tasks to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-3 bg-gray-500 text-white rounded-full hover:bg-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <StrictModeDroppable droppableId="todo-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="todo-list space-y-4"
              >
                {todos.map((todo, index) => (
                  <Draggable
                    key={todo.id.toString()}
                    draggableId={todo.id.toString()}
                    index={index}
                  >
                    {(provided) => (
                      <div className="flex flex-row gap-2 w-full items-center justify-between">
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`todo-item ${
                            todo.showMore ? "rounded-2xl" : "rounded-full"
                          }  justify-between w-[90%] p-4 px-8 shadow group flex items-center ${
                            todo.status === "to be done"
                              ? "bg-pink-50 bg-opacity-50 text-red-800 text-opacity-60"
                              : todo.status === "done"
                              ? "bg-green-50 text-green-800 text-opacity-60"
                              : "bg-yellow-50 text-yellow-800 text-opacity-60"
                          }`}
                        >
                          <div className="w-[10%]">
                            <div
                              className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center cursor-pointer ${
                                todo.status === "done"
                                  ? "border-green-500 bg-green-500"
                                  : "border-red-100"
                              }`}
                              onClick={() => handleComplete(todo)}
                            >
                              {todo.status === "done" && (
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                          </div>

                          <div className="w-[90%]">
                            <div className="flex  items-center">
                              <h3 className="text-lg font-semibold">
                                {todo.title}
                              </h3>
                            </div>
                            <div className="mt-4 gap-8 hidden group-hover:block">
                              <button
                                onClick={() => toggleShowMore(todo.id)}
                                className="text-gray-800 hover:text-blue-800 mr-2"
                              >
                                {todo.showMore ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-5"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      d="m4.5 15.75 7.5-7.5 7.5 7.5"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-5"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                                    />
                                  </svg>
                                )}
                              </button>{" "}
                              <button
                                onClick={() => handleEdit(todo)}
                                className="text-yellow-500 ml-4 hover:text-yellow-700 mr-2"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke-width="1.5"
                                  stroke="currentColor"
                                  class="size-5"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(todo.id)}
                                className="text-red-500 ml-4 hover:text-red-700"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke-width="1.5"
                                  stroke="currentColor"
                                  class="size-5"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                  />
                                </svg>
                              </button>
                            </div>
                            {todo.showMore && (
                              <div className="mt-2">
                                <div className="mb-2 white-space-pre-wrap">
                                  {/* {todo.description
                                    .split("\n")
                                    .map((line, index) => (
                                      <p key={index} className="mb-1">
                                        {line.startsWith("-") ? (
                                          <span className="block ml-4">
                                            {line}
                                          </span>
                                        ) : (
                                          line
                                        )}
                                      </p>
                                    ))} */}
                                  {todo.description}
                                </div>
                                <div className="mt-3 flex flex-row gap-2">
                                  <p className="">Due: </p>
                                  <p className="font-bold">
                                    {formatDueDate(todo.date_to_end)}{" "}
                                  </p>

                                  <p className="font-biro text-lg">
                                    (in {calculateDaysLeft(todo.date_to_end)}{" "}
                                    days){" "}
                                  </p>
                                </div>
                                <div className="flex flex-row gap-2">
                                  <p className="">Status: </p>
                                  <p className="font-bold">{todo.status}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 w-[10%] font-biro text-bold rounded-full text-xl whitespace-nowrap ${
                            todo.priority === "high"
                              ? " text-red-800"
                              : todo.priority === "medium"
                              ? " text-yellow-800"
                              : " text-green-800"
                          }`}
                        >
                          {getPriorityLabel(todo.priority)}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="p-10 border w-[50%] shadow-lg rounded-2xl bg-white">
              <h3 className="text-md font-medium leading-6 text-gray-900">
                {editingTodo ? "Edit Task" : "Add New Task"}
              </h3>
              <form onSubmit={handleSubmit} className="mt-4">
                <input
                  type="text"
                  name="title"
                  value={editingTodo ? editingTodo.title : newTodo.title}
                  onChange={handleInputChange}
                  placeholder="Title"
                  required
                  className="w-full p-2 mb-2 border rounded-md"
                />
                <textarea
                  name="description"
                  value={
                    editingTodo ? editingTodo.description : newTodo.description
                  }
                  onChange={handleInputChange}
                  placeholder="Description"
                  className="w-full p-2 mb-2 border rounded-md"
                />
                <input
                  type="date"
                  name="date_to_end"
                  value={
                    editingTodo ? editingTodo.date_to_end : newTodo.date_to_end
                  }
                  onChange={handleInputChange}
                  className="w-full p-2 mb-4 border rounded-md"
                />

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </h4>
                  <div className="flex space-x-2">
                    {["low", "medium", "high"].map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => {
                          if (editingTodo) {
                            setEditingTodo({ ...editingTodo, priority });
                          } else {
                            setNewTodo({ ...newTodo, priority });
                          }
                        }}
                        className={`px-4 py-2 text-sm rounded-md ${
                          ((editingTodo && editingTodo.priority) ||
                            newTodo.priority) === priority
                            ? "bg-gray-800 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {priority === "low"
                          ? "Can Wait"
                          : priority === "medium"
                          ? "Important"
                          : "Urgent"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-10">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Status
                  </h4>
                  <div className="flex space-x-2">
                    {["to be done", "in progress", "done"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          if (editingTodo) {
                            setEditingTodo({ ...editingTodo, status });
                          } else {
                            setNewTodo({ ...newTodo, status });
                          }
                        }}
                        className={`px-4 text-sm py-2 rounded-md ${
                          ((editingTodo && editingTodo.status) ||
                            newTodo.status) === status
                            ? "bg-gray-700 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {status === "to be done"
                          ? "To be done"
                          : status === "in progress"
                          ? "In progress"
                          : "Done"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-full hover:bg-gray-700"
                  >
                    {editingTodo ? "Update Task" : "Add Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="p-10 border w-96 shadow-lg rounded-2xl bg-white">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Confirm Deletion
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this task? This action cannot
                  be undone.
                </p>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-full hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {isClearAllModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="p-10 border w-96 shadow-lg rounded-2xl bg-white">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Confirm Clear All Tasks
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to clear all tasks? This action cannot
                  be undone.
                </p>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setIsClearAllModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-full hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
