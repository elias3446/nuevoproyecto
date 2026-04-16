const Index = () => {
  return (
    <div className="page-container">
      <div className="content-card text-center">
        <div className="w-20 h-20 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Bienvenido a la Plataforma</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Tu infraestructura está lista. Accede al panel de administración o comienza a explorar las funcionalidades.
        </p>
        <div className="space-y-3">
          <a href="/login" className="form-button-primary block">
            Ir al Login
          </a>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">o</p>
          <a href="/admin/" className="block w-full py-3 px-4 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-all">
            Django Admin
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
