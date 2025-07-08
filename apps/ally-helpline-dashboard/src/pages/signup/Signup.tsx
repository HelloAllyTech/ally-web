import { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { UserRole } from "@/types/user";
import { Button, Input } from "@/components";
import { useUser } from "@/hooks";
import { useSignupMutation } from "@/api/auth";
import { logger } from "@ally-ui-mono/ui-shared";

export const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: UserRole.CLIENT,
  });
  const { isAuthenticated } = useUser();

  const [signup, { isLoading: isSignupLoading }] = useSignupMutation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({
        email: formData.email,
        name: formData.name,
        role: formData.role,
        password: formData.password,
      });
      navigate("/login"); // Redirect to login page
    } catch (err) {
      toast.error("Signup failed. Please try again.");
      logger.info(`Signup failed:, ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-gray-400 mt-2">Sign up to continue to Ally</p>
          </div>
          <form onSubmit={e => e.preventDefault()} className="space-y-6">
            <div className="space-y-4">
              <Input
                type="name"
                placeholder="Name"
                value={formData.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                onKeyDown={e => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                required
                className="
                w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500
                "
              />
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                onKeyDown={e => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                required
                className="
                w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500
                "
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                onKeyDown={e => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                required
                className="
                w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500
                "
              />
            </div>
            <div>
              <select
                className="block w-full bg-gray-700 rounded-md border-gray-300 py-2 pl-3 text-white focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                value={formData.role}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
              >
                <option value={UserRole.CLIENT}>Client</option>
                <option value={UserRole.COUNSELOR}>Counselor</option>
              </select>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                type="button"
                onClick={handleSubmit}
                className="
                w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3
                rounded-lg transition-all duration-200 transform hover:scale-[1.02]
                "
                disabled={isSignupLoading}
              >
                {isSignupLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign up"
                )}
              </Button>
            </motion.div>
          </form>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-gray-400 text-sm"
          >
            Already have an account?{" "}
            <a href="/login" className="text-blue-500 hover:text-blue-400">
              Log in
            </a>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
