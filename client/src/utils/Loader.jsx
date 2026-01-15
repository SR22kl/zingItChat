import { motion } from "framer-motion";
import { RiChatSmileAiLine } from "react-icons/ri";

export default function Loader({ progress = 0 }) {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-purple-400 to-violet-500 flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.5,
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8"
      >
        <RiChatSmileAiLine className="w-16 h-16 text-purple-500" />
      </motion.div>
      <div className="w-64 bg-white bg-opacity-30 rounded-full h-2 mb-4">
        <motion.div
          className="bg-white h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <p className="text-white text-lg font-semibold">Loading... {progress}%</p>
    </div>
  );
}
