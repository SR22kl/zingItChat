import React, { useEffect, useState } from "react";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import useStatusStore from "../../store/statusStore";
import Layout from "../../components/Layout";
import StatusPreview from "./StatusPreview";
import { motion } from "framer-motion";
import { GiCrossedBones } from "react-icons/gi";
import {
  FaCamera,
  FaEllipsisH,
  FaPlus,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import formatTimestamp from "../../utils/formatTime";
import { SiInstatus } from "react-icons/si";
import StatusList from "./StatusList";

const Status = () => {
  const [previewContactId, setPreviewContactId] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showOption, setShowOption] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCreateModle, setShowCreateModle] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [filePreview, setFilePreview] = useState(null);

  const backUserPic =
    "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?semt=ais_hybrid&w=740&q=80";

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  //status store
  const {
    statuses,
    loading,
    error,
    fetchStatuses,
    createStatus,
    viewStatus,
    deleteStatus,
    getStatusViewers,
    getGroupStatus,
    getUserStatuses,
    getOtherStatuses,
    clearError,
    cleanupSocket,
    reset,
    initializeSocket,
  } = useStatusStore();

  const userStatuses = getUserStatuses(user?._id);
  const otherStatuses = getOtherStatuses(user?._id);

  useEffect(() => {
    fetchStatuses();
    initializeSocket();

    return () => {
      cleanupSocket();
    };
  }, [user?._id]);

  //clear the error when page is mounts
  useEffect(() => {
    return () => clearError();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);

      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
    e.target.value = null;
  };

  const handleCreateStatus = async () => {
    if (!newStatus.trim() && !selectedFile) return;

    try {
      await createStatus({
        content: newStatus,
        file: selectedFile,
      });
      setNewStatus("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowCreateModle(false);
    } catch (error) {
      console.error("Error creating status:", error);
    }
  };

  const handleViewStatus = async (statusId) => {
    try {
      await viewStatus(statusId);
    } catch (error) {
      console.error("Error viewing status:", error);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      setShowOption(false);
      handlePreviewClose();
    } catch (error) {
      console.error("Error deleting status:", error);
    }
  };

  const handlePreviewClose = () => {
    setPreviewContactId(null);
    setCurrentStatusIndex(0);
  };

  const handlePreviewNext = () => {
    const grouped = getGroupStatus();
    const contact = previewContactId ? grouped[previewContactId] : null;
    if (!contact) return handlePreviewClose();

    if (currentStatusIndex < contact.statuses.length - 1) {
      setCurrentStatusIndex((prev) => prev + 1);
    } else {
      handlePreviewClose();
    }
  };

  const handlePreviewPrev = () => {
    setCurrentStatusIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleStatusPreview = (contact, statusIndex = 0) => {
    setPreviewContactId(contact.id);
    setCurrentStatusIndex(statusIndex);

    if (contact.statuses[statusIndex]) {
      handleViewStatus(contact.statuses[statusIndex].id);
    }
  };

  return (
    <>
      <Layout
        isStatusPreviewOpen={!!previewContactId}
        statusPreviewContent={
          previewContactId &&
          (() => {
            const grouped = getGroupStatus();
            const contact = grouped[previewContactId];
            return (
              contact && (
                <StatusPreview
                  contact={contact}
                  currentIndex={currentStatusIndex}
                  onClose={handlePreviewClose}
                  onNext={handlePreviewNext}
                  onPrev={handlePreviewPrev}
                  onDelete={handleDeleteStatus}
                  theme={theme}
                  currentUser={user}
                  loading={loading}
                />
              )
            );
          })()
        }
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={` flex-1 h-screen border-r-2 ${
            theme === "dark"
              ? "bg-slate-950 text-white border-gray-800 shadow-lg"
              : "bg-white text-gray-800 border-gray-200 shadow-lg"
          }`}
        >
          <div
            className={` flex justify-center items-center shadow-md ${
              theme === "dark"
                ? "bg-slate-950 text-white"
                : "bg-white text-gray-800 "
            } p-4 font-bold text-2xl`}
          >
            <h2 className="">Status</h2>
          </div>
          {error && (
            <div className="bg-red-100 border border-red-500 text-red-700 px-4 py-3 rounded mx-4 mt-2">
              <span className="block sm:inline">{error}</span>
              <button className=" float-right cursor-pointer">
                <GiCrossedBones className="w-5 h-5 text-red-500 hover:text-shadow-red-700 " />
              </button>
            </div>
          )}

          <div className="overflow-y-auto h-[cal(100vh-64px)]">
            <div
              className={` flex px-3 shadow-md ${
                theme === "dark"
                  ? "bg-slate-950 text-white"
                  : "bg-white text-gray-800 "
              }`}
            >
              <div
                className=" relative cursor-pointer"
                onClick={() =>
                  userStatuses
                    ? handleStatusPreview(userStatuses)
                    : setShowCreateModle(true)
                }
              >
                <img
                  src={user?.profilePicture || backUserPic}
                  alt="user"
                  className="w-12 h-12 rounded-full object-cover"
                />

                {userStatuses ? (
                  <>
                    <svg
                      className=" absolute top-0 left-0 w-12 h-12"
                      viewBox="0 0 100 100"
                    >
                      {userStatuses.statuses.map((_, index) => {
                        const circumference = 2 * Math.PI * 48;
                        const segmentLength =
                          circumference / userStatuses.statuses.length;
                        const offset = index * segmentLength;
                        return (
                          <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r="48"
                            fill="none"
                            stroke={theme === "dark" ? "#fff" : "#000"}
                            strokeWidth="4"
                            strokeDasharray={`${segmentLength - 5} 5`}
                            strokeDashoffset={offset}
                            transform={`rotate(-90 50 50)`}
                          />
                        );
                      })}
                    </svg>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModle(true);
                      }}
                      className=" absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 duration-300 ease-in text-white p-1 rounded-full"
                    >
                      <FaPlus className="w-3 h-3 cursor-pointer" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModle(true);
                      }}
                      className=" absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 duration-300 ease-in  text-white p-1 rounded-full"
                    >
                      <FaPlus className="w-3 h-3 cursor-pointer" />
                    </button>
                  </>
                )}
              </div>

              <div className=" flex flex-col items-start flex-1 ml-2">
                <p className="font-semibold">My Status</p>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {userStatuses
                    ? `${userStatuses?.statuses?.length} status ${
                        userStatuses?.statuses?.length > 1 ? "." : ""
                      } ${formatTimestamp(
                        userStatuses?.statuses[
                          userStatuses?.statuses?.length - 1
                        ]?.timestamp
                      )}`
                    : "Tap to add status update"}
                </p>
              </div>

              {userStatuses && (
                <button
                  className="ml-auto"
                  onClick={() => setShowOption(!showOption)}
                >
                  <FaEllipsisH
                    className={`w-5 h-5 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  />
                </button>
              )}
            </div>

            {/* option menu */}
            {showOption && userStatuses && (
              <div
                className={` shadow-md p-2 ${
                  theme === "dark"
                    ? "bg-slate-950 text-white"
                    : "bg-white text-gray-800 "
                }`}
              >
                <button
                  onClick={() => {
                    setShowCreateModle(true);
                    setShowOption(false);
                  }}
                  className=" w-full text-left text-green-500 py-2 hover:bg-gray-100 px-2 rounded-md flex items-center"
                >
                  <FaCamera className="w-5 h-5 inline-block mr-2" />
                  Add Status
                </button>

                <button
                  onClick={() => {
                    handleStatusPreview(userStatuses);
                    setShowOption(false);
                  }}
                  className=" w-full text-left text-blue-500 py-2 hover:bg-gray-100 px-2 rounded-md"
                >
                  <SiInstatus className="w-5 h-5 inline-block mr-2" />
                  View Status
                </button>
              </div>
            )}

            {loading && (
              <div className=" flex justify-center items-center p-8">
                <div className=" animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            )}

            {/* Recent update from other users */}
            {!loading && otherStatuses.length > 0 && (
              <div
                className={` shadow-md p-4 space-y-4 ${
                  theme === "dark"
                    ? "bg-slate-950 text-white"
                    : "bg-white text-gray-800 "
                }`}
              >
                <h3
                  className={`font-semibold ${
                    theme === "dark" && "text-white"
                  }`}
                >
                  Recent Updates
                </h3>
                {otherStatuses.map((contact, index) => (
                  <React.Fragment key={contact?.id}>
                    <StatusList
                      contact={contact}
                      onPreview={() => handleStatusPreview(contact)}
                      theme={theme}
                    />
                    {index < otherStatuses.length - 1 && (
                      <hr
                        className={`${
                          theme === "dark"
                            ? "border-gray-700"
                            : "border-gray-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && otherStatuses.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div
                  className={`text-6xl mb-4 ${
                    theme === "dark" ? "text-gray-600" : "text-gray-800"
                  }`}
                >
                  📱
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  No Recent Updates
                </h3>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Tap on my status to add status update
                </p>
              </div>
            )}
          </div>

          {showCreateModle && (
            <div className=" fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div
                className={`p-6 rounded-lg max-w-md w-full mx-4 ${
                  theme === "dark" ? "bg-slate-900" : "bg-white"
                } `}
              >
                <h3
                  className={`text-lg font-semibold mb-4 ${
                    theme === "dark" ? "text-white" : "text-gray-800"
                  }`}
                >
                  Add Status
                </h3>
                {filePreview && (
                  <div className="mb-4">
                    {selectedFile.type.startsWith("video/") ? (
                      <video
                        src={filePreview}
                        controls
                        className="w-full h-32 object-cover rounded"
                      />
                    ) : (
                      <img
                        src={filePreview}
                        alt="file-preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>
                )}
                <textarea
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  className={`w-full p-2 rounded-md ${
                    theme === "dark" ? "bg-slate-800 text-white" : "bg-gray-100"
                  } focus:outline-none focus:ring-2 focus:ring-violet-600`}
                  rows={3}
                />

                <input
                  type="file"
                  accept="image/*, video/*"
                  onChange={handleFileChange}
                  className="mb-4"
                />

                <div className=" flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateModle(false);
                      setNewStatus("");
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    disabled={loading}
                    className={`px-4 py-2 rounded-md ${
                      theme === "dark"
                        ? "bg-slate-800 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleCreateStatus}
                    disabled={loading || (!newStatus.trim() && !selectedFile)}
                    className={`px-4 py-2 rounded-md cursor-pointer ${
                      theme === "dark"
                        ? "bg-purple-500 hover:bg-purple-600 duration-300 ease-in text-white"
                        : "bg-green-500 hover:bg-green-600 duration-300 ease-in text-gray-800"
                    }`}
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </Layout>
    </>
  );
};

export default Status;
