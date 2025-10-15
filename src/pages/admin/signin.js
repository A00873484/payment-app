import { signIn, getProviders } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { useRouter } from "next/router";
import Head from "next/head";
import { useState } from "react";

export default function AdminSignIn({ providers }) {
    console.log("AdminSignIn")
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const callbackUrl = "/admin"; // NOT router.query.callbackUrl


  const handleOAuthSignIn = async (providerId) => {
    setIsLoading(true);
    try {
      await signIn(providerId, { callbackUrl });
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  console.log("Signin");

  return (
    <>
      <Head>
        <title>Admin Sign In - Payment Portal</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🔐</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h1>
              <p className="text-gray-600">Sign in to access the admin dashboard</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Notice for Customers */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <p className="text-sm text-blue-900">
                <strong>Customer?</strong> You don&apos;t need to sign in! 
                Use the payment link sent to your email to access your orders.
              </p>
            </div>

            {/* OAuth Providers */}
            <div className="space-y-4">
              {providers && Object.values(providers).map((provider) => {
                let icon = "🔑";
                let bgColor = "from-gray-600 to-gray-700";
                
                if (provider.id === "google") {
                  icon = "🔍";
                  bgColor = "from-red-500 to-red-600";
                } else if (provider.id === "github") {
                  icon = "💻";
                  bgColor = "from-gray-800 to-black";
                }

                return (
                  <button
                    key={provider.id}
                    onClick={() => handleOAuthSignIn(provider.id)}
                    disabled={isLoading}
                    className={`w-full py-4 px-6 bg-gradient-to-r ${bgColor} hover:opacity-90 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span>Sign in with {provider.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-600">
                Only authorized staff can access the admin dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/*export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  console.log("getServerSideProps", session);
  // If already signed in, redirect to dashboard
  if (session) {
    return {
      redirect: {
        destination: "/admin/signin",
        permanent: false,
      },
    };
  }

  const providers = await getProviders();
  
  return {
    props: { providers: providers ?? [] },
  };
}*/

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/admin/signin",
        permanent: false,
      },
    };
  }
  return { props: { session } };
}
