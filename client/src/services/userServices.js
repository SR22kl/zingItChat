import axiosInstance from "./urlServices.js";

export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const response = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      phoneSuffix,
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const verifyOtp = async (phoneNumber, phoneSuffix, email, otp) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", {
      phoneNumber,
      phoneSuffix,
      email,
      otp,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const updateProfile = async (updatedData) => {
  try {
    // If updatedData is FormData (contains files), send multipart header
    const config = {};
    if (typeof FormData !== "undefined" && updatedData instanceof FormData) {
      config.headers = { "Content-Type": "multipart/form-data" };
    }

    const response = await axiosInstance.put(
      "/auth/update-profile",
      updatedData,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get("/auth/check-auth");
    if (response.data.status === "success") {
      return { isAuthenticated: true, user: response?.data?.data };
    } else if (response.data.status === "error") {
      return { isAuthenticated: false };
    }
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const logOutUser = async () => {
  try {
    const response = await axiosInstance.get("/auth/logout");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get("/auth/users");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};
