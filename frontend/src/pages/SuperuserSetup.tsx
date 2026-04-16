import React from "react";
import SuperuserSetupForm from "@/components/forms/SuperuserSetupForm";

const SuperuserSetup = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <h2 className="text-3xl font-bold text-white text-center mb-2">Setup Admin</h2>
        <p className="text-gray-400 text-center mb-8">
          Crea tu cuenta de superadministrador principal para acceder a la plataforma y a Django Admin.
        </p>
        
        <SuperuserSetupForm />
      </div>
    </div>
  );
};

export default SuperuserSetup;
