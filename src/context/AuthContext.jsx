import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(""); // always string
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setRole(parsedUser.role || "staff"); // ✅ always a string
    }
    setLoading(false);
  }, []);

  useEffect(() => {}, [role, user]);

  const login = (data) => {
    let userData = null;
    let detectedRole = "staff";

    if (data.user) {
      userData = data.user;
      detectedRole = data.user.role || "staff";
    } else if (data.patient || data.firstName) {
      userData = data.patient || data;
      detectedRole = "patient";
    } else if (data.role) {
      userData = data;
      detectedRole = data.role || "staff";
    } else {
      userData = data;
      detectedRole = data.role || "staff";
    }

    // ✅ Make sure role is always string
    if (typeof detectedRole !== "string") detectedRole = "staff";

    setUser(userData);
    setRole(detectedRole);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("role", detectedRole);
  };

  const logout = () => {
    setUser(null);
    setRole("");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  };

  const isPatient = role === "patient";
  const isAdmin = role === "admin";
  const isStaff = [
    "staff",
    "admin",
    "doctor",
    "nurse",
    "receptionist",
    "billing",
  ].includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isPatient,
        isStaff,
        isAdmin,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
