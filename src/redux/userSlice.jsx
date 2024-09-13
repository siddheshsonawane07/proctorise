import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  uid: null,
  displayName: null,
  email: null,
  photoUrl: null,
  isLoggedIn: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { uid, displayName, email, photoUrl } = action.payload;
      state.uid = uid;
      state.displayName = displayName;
      state.email = email;
      state.photoUrl = photoUrl;
      state.isLoggedIn = true;
    },
    logoutSuccess: (state) => {
      state.uid = null;
      state.displayName = null;
      state.email = null;
      state.photoUrl = null;
      state.isLoggedIn = false;
    },
  },
});

export const { loginSuccess, logoutSuccess } = userSlice.actions;
export default userSlice.reducer;
