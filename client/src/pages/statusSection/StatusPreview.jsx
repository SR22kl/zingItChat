import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import formatTimestamp from "../../utils/formatTime";
import {
  FaChevronDown,
  FaChevronLeft,
  FaEllipsisH,
  FaChevronRight,
  FaEye,
  FaTrash,
} from "react-icons/fa";
import { GiCrossMark } from "react-icons/gi";

const StatusPreview = ({
  contact,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onDelete,
  theme,
  currentUser,
  loading,
}) => {
  const [progress, setProgress] = useState();
  const [showViewers, setShowViewers] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const currentStatus = contact?.statuses[currentIndex];
  const isOwnerStatus = contact?.id === (currentUser?._id || currentUser?.id);

  const backUserPic =
    "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?semt=ais_hybrid&w=740&q=80";

  useEffect(() => {
    setProgress(0);

    let current = 0;

    const interval = setInterval(() => {
      current += 2; // increase process by 2% 1--ms 50 stpes = 5 sec
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        onNext();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex]);

  useEffect(() => {
    // debug: log currentStatus viewers when preview changes
    console.debug("StatusPreview: currentStatus", currentStatus);
    console.debug(
      "StatusPreview: currentStatus.viewers",
      currentStatus?.viewers
    );
  }, [currentStatus]);

  const handleViewersToggle = () => {
    setShowViewers(!showViewers);
  };

  const handleDeleteStatus = () => {
    if (onDelete && currentStatus) {
      onDelete(currentStatus.id);
    }
    if (contact.statuses.length === 1) {
      onClose();
    } else {
      onPrev();
    }
  };

  if (!currentStatus) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 w-full h-full flex items-center justify-center z-50 `}
        onClick={onClose}
      >
        {/* Backdrop layer (separate so modal content remains fully opaque) */}
        <div
          className="absolute inset-0 bg-black/50"
          style={{ backdropFilter: "blur(5px)" }}
        />

        <div
          className="relative w-full h-full max-w-4xl mx-auto flex justify-center items-center z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`w-full h-full opacity-100 ${
              theme === "dark" ? "bg-slate-950" : "bg-white"
            } relative`}
          >
            {/* Top progress bars across full width */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-2">
              {contact?.statuses?.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full overflow-hidden ${
                    theme === "dark" ? "bg-white/20" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-100 ease-linear ${
                      index < currentIndex
                        ? theme === "dark"
                          ? "bg-white"
                          : "bg-gray-800"
                        : index === currentIndex
                        ? theme === "dark"
                          ? "bg-white"
                          : "bg-gray-800"
                        : "bg-transparent"
                    } rounded-full`}
                    style={{
                      width:
                        index < currentIndex
                          ? "100%"
                          : index === currentIndex
                          ? `${progress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Avatar, name and timestamp at top-left */}
            <div className="absolute top-4 left-6 z-30 flex items-center space-x-3">
              <img
                src={contact?.avatar || backUserPic}
                alt={contact?.name || "User"}
                className="w-10 h-10 rounded-full object-cover border-2"
                style={{ borderColor: theme === "dark" ? "#fff" : "#fff" }}
              />
              <div className="flex flex-col">
                <p
                  className={`${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  } font-semibold`}
                >
                  {contact?.name}
                </p>
                <p
                  className={`${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  } text-sm`}
                >
                  {formatTimestamp(currentStatus.timestamp)}
                </p>
              </div>
            </div>

            {/* options (ellipsis) */}
            <div className="absolute top-4 right-12 z-30 flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions((s) => !s);
                }}
                className={`rounded-full p-2 transition-all duration-100 ease-linear ${
                  theme === "dark"
                    ? "text-white bg-black/50 hover:bg-black/70"
                    : "text-gray-800 bg-white hover:bg-gray-100"
                }`}
              >
                <FaEllipsisH className="h-5 w-5" />
              </button>

              {showOptions && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`ml-2 mt-2 absolute right-0 top-10 w-40 rounded-md shadow-lg p-2 ${
                    theme === "dark"
                      ? "bg-slate-800 text-white"
                      : "bg-white text-gray-900"
                  }`}
                >
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-2 ${
                      theme === "dark"
                        ? "text-white hover:bg-gray-700 rounded"
                        : "text-gray-800 hover:bg-gray-200 rounded"
                    } `}
                  >
                    <GiCrossMark className="h-5 w-5 inline-block mr-2" />
                    Close
                  </button>

                  {isOwnerStatus && (
                    <button
                      onClick={() => {
                        setShowOptions(false);
                        handleDeleteStatus();
                      }}
                      className={`w-full text-left px-3 py-2 ${
                        theme === "dark"
                          ? "text-red-500 hover:bg-gray-700 rounded"
                          : "text-red-600 hover:bg-gray-200 rounded"
                      } `}
                    >
                      <FaTrash className="h-5 w-5 inline-block mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="w-full h-full flex items-center justify-center relative">
              {currentStatus.contentType === "text" ? (
                <div className="text-center p-8">
                  <p
                    className={`${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    } text-2xl font-medium`}
                  >
                    {currentStatus?.media}
                  </p>
                </div>
              ) : currentStatus?.contentType === "image" ? (
                <img
                  src={currentStatus?.media}
                  alt={"image"}
                  className="max-w-full max-h-full object-cover"
                />
              ) : currentStatus?.contentType === "video" ? (
                <video
                  src={currentStatus?.media}
                  controls
                  muted
                  autoPlay
                  className="max-w-full max-h-full object-cover"
                />
              ) : null}

              {/* Caption for media (image/video) */}
              {currentStatus?.caption &&
                currentStatus.contentType !== "text" && (
                  <div
                    className={`absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md max-w-[90%] text-center ${
                      theme === "dark"
                        ? "bg-black/70 text-white"
                        : "bg-white/90 text-gray-900"
                    }`}
                  >
                    {currentStatus.caption}
                  </div>
                )}
            </div>

            {/* removed standalone close button; use options menu for actions */}

            {currentIndex > 0 && (
              <button
                onClick={onPrev}
                className={` absolute top-1/2 left-4 transition -translate-y-1/2 rounded-full p-3 ${
                  theme === "dark"
                    ? "text-white bg-black/70 hover:bg-black/80"
                    : "text-gray-800 bg-white hover:bg-gray-100"
                }`}
              >
                <FaChevronLeft className="h-5 w-5" />
              </button>
            )}

            {currentIndex < contact.statuses.length - 1 && (
              <button
                onClick={onNext}
                className={` absolute top-1/2 right-4 transition -translate-y-1/2 rounded-full p-3 ${
                  theme === "dark"
                    ? "text-white bg-black/70 hover:bg-black/80"
                    : "text-gray-800 bg-white hover:bg-gray-100"
                }`}
              >
                <FaChevronRight className="h-5 w-5" />
              </button>
            )}

            {isOwnerStatus && (
              <div className=" absolute bottom-4 left-4 ring-4">
                <button
                  onClick={handleViewersToggle}
                  className={` flex items-center justify-between w-full rounded-lg px-4 py-2 transition-all ${
                    theme === "dark"
                      ? "text-white bg-black/70 hover:bg-black/80"
                      : "text-gray-800 bg-white hover:bg-gray-100"
                  }`}
                >
                  <div className=" flex items-center space-x-4">
                    <FaEye className="h-5 w-5" />
                    <span>{currentStatus?.viewers.length || 0}</span>
                  </div>

                  <FaChevronDown
                    className={`h-5 w-5 transition-transform ${
                      showViewers ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {showViewers && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.5 }}
                      className={`${
                        theme === "dark" ? "bg-black/70" : "bg-white"
                      } rounded-lg p-4 max-h-40 mt-2 overflow-y-auto`}
                    >
                      {loading ? (
                        <p className="text-center">Loading Viewers</p>
                      ) : currentStatus?.viewers &&
                        currentStatus.viewers.length > 0 ? (
                        <div className="space-y-2">
                          {currentStatus?.viewers.map((viewer) => {
                            const viewerId = viewer?._id || viewer?.id;
                            const isSelf =
                              viewerId ===
                              (currentUser?._id || currentUser?.id);
                            const name = isSelf
                              ? "You"
                              : viewer?.userName || viewer?.userName || "User";
                            const avatar = isSelf
                              ? currentUser?.profilePicture ||
                                viewer?.profilePicture ||
                                backUserPic
                              : viewer?.profilePicture || backUserPic;

                            return (
                              <div
                                key={viewerId}
                                className="flex items-center space-x-3"
                              >
                                <img
                                  src={avatar}
                                  alt={name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <span
                                  className={`${
                                    theme === "dark"
                                      ? "text-white"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p
                          className={`${
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }`}
                        >
                          No Viewers Yet
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default StatusPreview;
