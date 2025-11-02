import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../lib/firebaseconfig";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  onAuthStateChanged,
  User,
  AuthError
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        navigate("/chat");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const getErrorMessage = (error: AuthError): string => {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email/password accounts are not enabled. Please contact support.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/user-not-found":
        return "No account found with this email. Please sign up first.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      case "auth/popup-blocked":
        return "Popup was blocked. Please allow popups for this site and try again.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: "Account created!",
          description: "Your account has been created successfully.",
        });
      }
      navigate("/chat");
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Authentication Error",
        description: getErrorMessage(authError),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast({
        title: "Welcome!",
        description: "You've successfully signed in with Google.",
      });
      navigate("/chat");
    } catch (error) {
      const authError = error as AuthError;
      // Don't show error for user cancellation
      if (authError.code !== "auth/popup-closed-by-user" && authError.code !== "auth/cancelled-popup-request") {
        toast({
          title: "Google Sign-In Error",
          description: getErrorMessage(authError),
          variant: "destructive",
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center mb-2">
            <img 
              src="/google-shield.svg" 
              alt="TrueLens AI" 
              className="w-16 h-16"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-500">
            TrueLens AI
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin 
              ? "Sign in to verify news and detect misinformation" 
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || googleLoading}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || googleLoading}
                required
                minLength={6}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-11 text-base font-semibold"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign In" : "Sign Up"
              )}
            </Button>
          </form>
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full h-11 bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
            variant="outline"
          >
            {googleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
       
{/* 
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-lg font-semibold uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                OR
              </span>
            </div>
          </div> */}

          {/* Google Sign-In Button */}
          <div className="text-sm text-center text-muted-foreground">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setEmail("");
                    setPassword("");
                  }}
                  className="text-primary hover:underline font-medium"
                  disabled={loading || googleLoading}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setEmail("");
                    setPassword("");
                  }}
                  className="text-primary hover:underline font-medium"
                  disabled={loading || googleLoading}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

        </CardFooter>
      </Card>
    </div>
  );
}
