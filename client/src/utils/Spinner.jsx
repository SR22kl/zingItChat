import { motion } from "framer-motion";
import { RiChatSmileAiLine } from "react-icons/ri";

export default function Spinner({ size = "medium", color = "light" }) {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  return (
    <motion.div
      className="flex items-center justify-center space-x-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`${sizeClasses[size]} bg-linear-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg`}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        style={{
          boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <RiChatSmileAiLine className="w-3/4 h-3/4 text-white" />
        </motion.div>
      </motion.div>
      <motion.span
        className="text-white text-lg font-semibold bg-linear-to-r from-purple-300 to-pink-300 bg-clip-text"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      >
        Loading...
      </motion.span>
    </motion.div>
  );
}
