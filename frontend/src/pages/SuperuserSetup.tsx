import React from "react";
import SuperuserSetupForm from "@/components/forms/SuperuserSetupForm";

const SuperuserSetup = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-header">Setup Admin</h2>
        <p className="auth-subtext">
          Crea tu cuenta de superadministrador principal para acceder a la plataforma y a Django Admin.
        </p>
        
        <SuperuserSetupForm />
      </div>
    </div>
  );
};

export default SuperuserSetup;
