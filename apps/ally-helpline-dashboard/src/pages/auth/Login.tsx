import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Lifeline } from "@/assets/icons";
import { Login as LoginImage } from "@/assets/images";
import { Button, TextField } from "@/components";
import { useUser } from "@/hooks";
import { LoginSchema, loginSchema } from "./schema";
import { useLoginMutation } from "./api";

const Login = () => {
  const navigate = useNavigate();

  const [login, { isLoading, isSuccess, data }] = useLoginMutation();

  const { isAuthenticated, checkAuth } = useUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  const loading = isLoading || isSubmitting;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    (async () => {
      if (isSuccess && data) {
        try {
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          await checkAuth();
          navigate("/");
        } catch (error) {
          toast.error(
            error?.response?.data?.detail ??
              "Invalid credentials. Please try again."
          );
          console.error("Error logging in - ", error);
        }
      }
    })();
  }, [isSuccess, navigate]);

  const onSubmit = ({ email, password }: LoginSchema) => {
    login({ username: email, password });
  };

  return (
    <div className="flex h-screen">
      <img
        src={LoginImage}
        alt="Login"
        className="flex-2 h-auto object-cover"
        width="60%"
      />
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-1/2 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[22px]">Welcome to</h1>
            <Lifeline className="cursor-pointer" />
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-[12px]">
              <TextField
                name="email"
                label="Email address"
                register={register}
                errors={errors}
                fieldSize="medium"
              />
              <TextField
                name="password"
                label="Password"
                type="password"
                register={register}
                errors={errors}
                fieldSize="medium"
              />
              <span
                className="text-[12px] font-medium text-[#3877D9]"
                // onClick={() => navigate("/auth/forgot-password")}
              >
                Forgot password?
              </span>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
