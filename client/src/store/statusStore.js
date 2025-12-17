import { create } from "zustand";
import { getSocket } from "../services/chatService";
import axiosInstance from "../services/urlServices";

const useStatusStore = create((set, get) => ({
  //state
  statuses: [],
  loading: false,
  error: null,

  //actions
  setStatuses: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  //Initailize the socket listners
  initializeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    //Real-time status events
    socket.on("new_status", (newStatus) => {
      set((state) => ({
        statuses: state.statuses.some((s) => s._id === newStatus._id)
          ? state.statuses
          : [newStatus, ...state.statuses],
      }));
    });

    socket.on("status_deleted", (statusId) => {
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
    });

    // server emits an object: { statusId, viewerId, totalViewers, viewers }
    socket.on("status_viewed", (viewData) => {
      console.debug("socket: status_viewed payload:", viewData);
      const statusId = viewData?.statusId || viewData?.status || null;
      const viewers = viewData?.viewers || viewData?.viewersList || [];

      if (!statusId) return;

      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status, viewers } : status
        ),
      }));
    });
  },

  //cleanup the socket listners
  cleanupSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("new_status");
      socket.off("status_deleted");
      socket.off("status_viewed");
    }
  },

  //fetch status
  fetchStatuses: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/status/get");
      set({ statuses: data.data || [], loading: false });
    } catch (error) {
      console.error("Error fetching statuses:", error);
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
    }
  },

  //create status
  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();

      if (statusData.file) {
        formData.append("media", statusData.file);
      }
      if (statusData.content?.trim()) {
        formData.append("content", statusData.content);
      }

      const { data } = await axiosInstance.post("/status/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      //add to status in local state
      if (data?.data) {
        set((state) => ({
          statuses: state.statuses.some((s) => s._id === data.data._id)
            ? state.statuses
            : [data.data, ...state.statuses],
        }));
      }

      set({ loading: false });

      return data.data;
    } catch (error) {
      console.error("Error creating status:", error);
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      throw error;
    }
  },

  //view status
  viewStatus: async (statusId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.put(`/status/view/${statusId}`);
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status, isViewed: true } : status
        ),
      }));
      set({ loading: false });
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
    }
  },

  //delete status
  deleteStatus: async (statusId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.delete(`/status/delete/${statusId}`);
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
      set({ loading: false });
    } catch (error) {
      console.error("Error deleting status:", error);
      set({
        error: error?.response?.data?.message || error?.message,
      });
      throw error;
    }
  },

  //get status view
  getStatusViewers: async (statusId) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(`/status/viewers/${statusId}`);
      set({ loading: false });

      return data.data;
    } catch (error) {
      console.error("Error fetching status viewers:", error);
      set({
        error: error?.response?.data?.message || error?.message,
      });
      throw error;
    }
  },

  //helper function for group status
  getGroupStatus: () => {
    const { statuses } = get();
    return statuses.reduce((acc, status) => {
      const statusUserId = status.user?._id;
      if (!acc[statusUserId]) {
        acc[statusUserId] = [];
        acc[statusUserId] = {
          id: statusUserId,
          name: status.user?.userName,
          avatar: status.user?.profilePicture,
          statuses: [],
        };
      }
      acc[statusUserId].statuses.push({
        id: status._id,
        // `media` is media url for image/video; fallback to content for text-only statuses
        media: status.media || status.content,
        caption: status.content || "",
        contentType: status.contentType,
        timestamp: status.createdAt,
        viewers: status.viewers,
      });
      return acc;
    }, {});
  },

  //user status
  getUserStatuses: (userId) => {
    const groupedStatus = get().getGroupStatus();
    return userId ? groupedStatus[userId] : groupedStatus;
  },

  getOtherStatuses: (userId) => {
    const groupedStatus = get().getGroupStatus();
    return Object.values(groupedStatus).filter(
      (contact) => contact.id !== userId
    );
  },

  //clear error
  clearError: () => set({ error: null }),

  reset: () => set({ statuses: [], loading: false, error: null }),
}));

export default useStatusStore;
