import React, { useState } from 'react';
import { useAuth, useRedirectByRole } from '../context/AuthContext.jsx'

const demoUsers = {
  student: { email: "student@demo.com", password: "student123" },
  staff: { email: "staff@demo.com", password: "staff123" },
  admin: { email: "admin@demo.com", password: "admin123" }
};

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const redirectByRole = useRedirectByRole()
  const { login } = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()
    const matchedRole = Object.keys(demoUsers).find(r => {
      const u = demoUsers[r]
      return normalizedEmail === u.email.toLowerCase() && normalizedPassword === u.password
    })

    if (matchedRole) {
      const roleLabel = matchedRole.charAt(0).toUpperCase()+matchedRole.slice(1)
      const profile = { role: matchedRole, email, name: roleLabel + ' User' }
      login(profile)
      redirectByRole(matchedRole)
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-bold">Attendance Monitor</h1>
          <p className="text-gray-600">Sign in with Student, Staff, or Admin</p>
        </div>
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold mb-4">Sign In</h2>
          <p className="text-sm text-gray-500 mb-4">Enter your credentials to access the attendance monitoring system</p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">User Name</label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded bg-gray-100"
              placeholder="Enter your user name"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded bg-gray-100"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
