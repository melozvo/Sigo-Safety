import React, { useState, useEffect, useRef } from 'react';
import { User, WorkFront, FrontStatus, RiskLevel, RiskDefinition, SelectedRisk, Question, RoutineRecord, Deviation, Severity, ActionTaken } from './types';
import { INITIAL_USER, MOCK_FRONTS, RISK_CATALOG, ROUTINE_QUESTIONS } from './constants';
import Header from './components/Header';

// View Enums
enum View {
  WELCOME,
  REGISTRATION,
  HOME,
  FRONT_LIST,
  CREATE_FRONT_NAME,
  CREATE_FRONT_RISK,
  EDIT_FRONT_NAME,
  EDIT_FRONT_RISK,
  FRONT_DETAIL,
  ROUTINE_STEP,
  REPORT_DEVIATION,
  ROUTINE_FINISH,
  PROFILE,
  HISTORY,
  FRONT_HISTORY,
  REPORT_DETAIL
}

const STORAGE_KEYS = {
  USER: 'sigo_user',
  FRONTS: 'sigo_fronts',
  SITES: 'sigo_sites',
  ACTIVE_SITE: 'sigo_active_site_index',
  DARK_MODE: 'sigo_dark_mode',
  HISTORY: 'sigo_history'
};

// Utility para compresión de imagen
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        resolve(dataUrl);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const loadStored = <T,>(key: string, defaultValue: T): T => {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try {
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  };

  const [user, setUser] = useState<User>(() => loadStored(STORAGE_KEYS.USER, INITIAL_USER));
  const [fronts, setFronts] = useState<WorkFront[]>(() => loadStored(STORAGE_KEYS.FRONTS, MOCK_FRONTS));
  const [sites, setSites] = useState<string[]>(() => loadStored(STORAGE_KEYS.SITES, ['Proyecto Sin Nombre - Fase I']));
  const [activeSiteIndex, setActiveSiteIndex] = useState(() => loadStored(STORAGE_KEYS.ACTIVE_SITE, 0));
  const [isDarkMode, setIsDarkMode] = useState(() => loadStored(STORAGE_KEYS.DARK_MODE, false));
  const [history, setHistory] = useState<RoutineRecord[]>(() => loadStored(STORAGE_KEYS.HISTORY, []));

  const [currentView, setCurrentView] = useState<View>(() => {
    const storedUser = loadStored<User>(STORAGE_KEYS.USER, INITIAL_USER);
    return storedUser.name ? View.HOME : View.WELCOME;
  });

  const [selectedFront, setSelectedFront] = useState<WorkFront | null>(null);
  const [selectedReport, setSelectedReport] = useState<RoutineRecord | null>(null);
  const [newFrontName, setNewFrontName] = useState('');
  
  // Routine State
  const [routineQuestions, setRoutineQuestions] = useState<Question[]>([]);
  const [routineProgress, setRoutineProgress] = useState(0);
  const [currentDeviations, setCurrentDeviations] = useState<Deviation[]>([]);
  
  const [isSiteManagerOpen, setIsSiteManagerOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [listFilter, setListFilter] = useState<'ALL' | 'REVISED' | 'PENDING'>('ALL');

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.FRONTS, JSON.stringify(fronts)); }, [fronts]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sites)); }, [sites]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ACTIVE_SITE, JSON.stringify(activeSiteIndex)); }, [activeSiteIndex]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)); }, [history]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión? Se borrarán los datos locales.')) {
      localStorage.clear();
      setUser(INITIAL_USER);
      setFronts([]);
      setSites(['Proyecto Sin Nombre - Fase I']);
      setActiveSiteIndex(0);
      setHistory([]);
      setCurrentView(View.WELCOME);
    }
  };

  const calculateEPP = (selectedRisks: SelectedRisk[]) => {
    const eppSet = new Set<string>(['Casco de seguridad', 'Calzado de seguridad', 'Chaleco reflectivo']);
    selectedRisks.forEach(sr => {
      const riskDef = RISK_CATALOG.find(r => r.id === sr.riskId);
      if (riskDef && riskDef.eppMap[sr.level]) {
        riskDef.eppMap[sr.level]?.forEach(item => eppSet.add(item));
      }
    });
    return Array.from(eppSet);
  };

  const startRoutine = (front: WorkFront) => {
    const riskIds = front.selectedRisks.map(r => r.riskId);
    const eppQuestion = ROUTINE_QUESTIONS.find(q => q.id === 'epp_check')!;
    const specificQuestions = ROUTINE_QUESTIONS.filter(q => q.riskId && riskIds.includes(q.riskId));
    const generalQuestions = ROUTINE_QUESTIONS.filter(q => !q.riskId && q.id !== 'epp_check');
    const shuffledGeneral = [...generalQuestions].sort(() => 0.5 - Math.random()).slice(0, 1);
    const combined = [eppQuestion, ...specificQuestions, ...shuffledGeneral];
    setRoutineQuestions(combined);
    setRoutineProgress(0);
    setCurrentDeviations([]);
    setCurrentView(View.ROUTINE_STEP);
  };

  const saveFinishedRoutine = (signature: string) => {
    if (!selectedFront) return;
    
    // Determine status logic based on severity
    let finalStatus = FrontStatus.CONTROLLED;
    if (currentDeviations.length > 0) {
      const hasCritical = currentDeviations.some(d => d.severity === 'CRITICA' || d.severity === 'ALTA');
      finalStatus = hasCritical ? FrontStatus.ATTENTION : FrontStatus.OBSERVATION;
    }

    const newRecord: RoutineRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      frontName: selectedFront.name,
      siteName: selectedFront.siteName || sites[activeSiteIndex],
      supervisorName: user.name,
      supervisorSignature: signature,
      deviations: currentDeviations,
      questionsChecked: routineQuestions.length,
      statusResult: finalStatus
    };

    setHistory([newRecord, ...history]);

    const updatedFronts = fronts.map(f => f.id === selectedFront.id ? {
      ...f, 
      status: finalStatus, 
      lastReview: 'Hace un momento'
    } : f);
    setFronts(updatedFronts);

    setCurrentView(View.HOME);
  };

  const deleteReport = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este informe permanentemente? Esta acción no se puede deshacer.')) {
      const newHistory = history.filter(r => r.id !== id);
      setHistory(newHistory);
      // Si el reporte eliminado estaba seleccionado, lo deseleccionamos (aunque estemos en la lista)
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    }
  };

  const getActiveSiteFronts = () => {
    const activeSiteName = sites[activeSiteIndex];
    return fronts.filter(f => f.siteName === activeSiteName || (!f.siteName && activeSiteName === sites[0]));
  };

  const renderView = () => {
    const viewContent = () => {
      switch (currentView) {
        case View.WELCOME: return <WelcomeView onStart={() => setCurrentView(View.REGISTRATION)} />;
        case View.REGISTRATION: return <RegistrationView user={user} onSave={(u) => { setUser(u); setCurrentView(View.HOME); }} />;
        case View.HOME: return (
          <HomeView 
            user={user} 
            fronts={getActiveSiteFronts()} 
            activeSite={sites[activeSiteIndex]}
            onOpenSiteManager={() => setIsSiteManagerOpen(true)}
            onShowAbout={() => setIsAboutOpen(true)}
            onSOS={() => setIsSOSOpen(true)}
            onSelectFront={(f) => { setSelectedFront(f); setCurrentView(View.FRONT_DETAIL); }} 
            onCreateFront={() => setCurrentView(View.CREATE_FRONT_NAME)} 
            onProfile={() => setCurrentView(View.PROFILE)} 
            onHistory={() => setCurrentView(View.HISTORY)}
            onFilterList={(filter) => { setListFilter(filter); setCurrentView(View.FRONT_LIST); }}
          />
        );
        case View.FRONT_LIST: return (
          <FrontListView 
            fronts={getActiveSiteFronts()} 
            filter={listFilter}
            onBack={() => setCurrentView(View.HOME)} 
            onSelectFront={(f) => { setSelectedFront(f); setCurrentView(View.FRONT_DETAIL); }} 
          />
        );
        case View.CREATE_FRONT_NAME: return <CreateFrontNameView onNext={(name) => { setNewFrontName(name); setCurrentView(View.CREATE_FRONT_RISK); }} onBack={() => setCurrentView(View.HOME)} />;
        case View.CREATE_FRONT_RISK: return (
          <RiskMatrixView 
            title={`Riesgos: ${newFrontName}`}
            initialSelections={[]}
            onFinish={(selectedRisks) => {
              const newFront: WorkFront = {
                id: Math.random().toString(),
                name: newFrontName,
                status: FrontStatus.NO_RECENT_REVIEW,
                lastReview: 'Sin revisiones',
                selectedRisks: selectedRisks,
                epp: calculateEPP(selectedRisks),
                frequency: 'Diaria',
                supervisor: user.name,
                siteName: sites[activeSiteIndex]
              };
              setFronts([...fronts, newFront]);
              setCurrentView(View.HOME);
            }} 
            onBack={() => setCurrentView(View.CREATE_FRONT_NAME)} 
          />
        );
        case View.EDIT_FRONT_NAME: return (
          <EditFrontNameView 
            initialName={selectedFront?.name || ''} 
            onSave={(newName) => {
              if (selectedFront) {
                const updated = fronts.map(f => f.id === selectedFront.id ? { ...f, name: newName } : f);
                setFronts(updated);
                setSelectedFront({ ...selectedFront, name: newName });
                setCurrentView(View.FRONT_DETAIL);
              }
            }} 
            onBack={() => setCurrentView(View.FRONT_DETAIL)} 
          />
        );
        case View.EDIT_FRONT_RISK: return (
          <RiskMatrixView 
            title={`Editar Riesgos`}
            initialSelections={selectedFront?.selectedRisks || []}
            onFinish={(selectedRisks) => {
              if (selectedFront) {
                const updated = fronts.map(f => f.id === selectedFront.id ? { ...f, selectedRisks: selectedRisks, epp: calculateEPP(selectedRisks) } : f);
                setFronts(updated);
                setSelectedFront({...selectedFront, selectedRisks, epp: calculateEPP(selectedRisks)});
                setCurrentView(View.FRONT_DETAIL);
              }
            }} 
            onBack={() => setCurrentView(View.FRONT_DETAIL)} 
          />
        );
        case View.FRONT_DETAIL: return (
          <FrontDetailView 
            front={selectedFront!} 
            // Pasamos el conteo de reportes específicos para este frente
            historyCount={history.filter(h => h.frontName === selectedFront?.name).length}
            onBack={() => setCurrentView(View.HOME)} 
            onDelete={(id) => {
              if (window.confirm('¿Eliminar este frente?')) {
                 setFronts(fronts.filter(f => f.id !== id));
                 setCurrentView(View.HOME);
              }
            }} 
            onEditName={() => setCurrentView(View.EDIT_FRONT_NAME)}
            onEditRisks={() => setCurrentView(View.EDIT_FRONT_RISK)}
            onStartRoutine={() => startRoutine(selectedFront!)} 
            onViewHistory={() => setCurrentView(View.FRONT_HISTORY)}
          />
        );
        case View.ROUTINE_STEP: return (
          <RoutineStepView 
            questions={routineQuestions}
            step={routineProgress} 
            front={selectedFront!}
            onNext={(hasRisk) => {
              if (hasRisk) {
                setCurrentView(View.REPORT_DEVIATION);
              } else {
                if (routineProgress < routineQuestions.length - 1) {
                  setRoutineProgress(prev => prev + 1);
                } else {
                  setCurrentView(View.ROUTINE_FINISH);
                }
              }
            }} 
            onCancel={() => setCurrentView(View.FRONT_DETAIL)} 
          />
        );
        case View.REPORT_DEVIATION: return (
          <ReportDeviationView 
            question={routineQuestions[routineProgress]}
            onConfirm={(deviation) => {
              setCurrentDeviations([...currentDeviations, deviation]);
              if (routineProgress < routineQuestions.length - 1) {
                setRoutineProgress(prev => prev + 1);
                setCurrentView(View.ROUTINE_STEP);
              } else {
                setCurrentView(View.ROUTINE_FINISH);
              }
            }} 
            onBack={() => setCurrentView(View.ROUTINE_STEP)} 
          />
        );
        case View.ROUTINE_FINISH: return (
          <RoutineFinishView onSave={(signature) => saveFinishedRoutine(signature)} />
        );
        case View.PROFILE: return (
          <ProfileView 
            user={user} 
            isDarkMode={isDarkMode} 
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
            onBack={() => setCurrentView(View.HOME)} 
            onLogout={handleLogout} 
            onUpdateUser={(u) => setUser(u)}
          />
        );
        case View.HISTORY: return (
          <HistoryView 
            records={history}
            onBack={() => setCurrentView(View.HOME)} 
            onSelect={(record) => { setSelectedReport(record); setCurrentView(View.REPORT_DETAIL); }} 
            onDelete={deleteReport}
          />
        );
        case View.FRONT_HISTORY: return (
          // Reutilizamos HistoryView pero filtrado por el frente seleccionado
          <HistoryView 
            records={history.filter(h => h.frontName === selectedFront?.name)}
            onBack={() => setCurrentView(View.FRONT_DETAIL)} 
            onSelect={(record) => { setSelectedReport(record); setCurrentView(View.REPORT_DETAIL); }} 
            onDelete={deleteReport}
          />
        );
        case View.REPORT_DETAIL: return (
           <ReportDetailView 
             record={selectedReport!} 
             onBack={() => {
                // Si el reporte seleccionado pertenece al frente actual, volvemos al historial del frente
                if (selectedReport?.frontName === selectedFront?.name) {
                  setCurrentView(View.FRONT_HISTORY);
                } else {
                  setCurrentView(View.HISTORY);
                }
             }} 
             userCompany={user.company}
           />
        );
        default: return <WelcomeView onStart={() => setCurrentView(View.REGISTRATION)} />;
      }
    };
    
    return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
        {viewContent()}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto h-full bg-background-light dark:bg-background-dark shadow-2xl relative flex flex-col transition-colors duration-200 print:max-w-none print:shadow-none print:bg-white print:text-black">
      {renderView()}
      {isSiteManagerOpen && (
        <SiteManager 
          sites={sites} 
          fronts={fronts}
          activeIndex={activeSiteIndex} 
          onClose={() => setIsSiteManagerOpen(false)} 
          onSelectSite={(idx) => { setActiveSiteIndex(idx); setIsSiteManagerOpen(false); }}
          onAddSite={(name) => setSites([...sites, name])}
          onEditSite={(idx, name) => {
            const oldName = sites[idx];
            const newSites = [...sites];
            newSites[idx] = name;
            setSites(newSites);
            const updatedFronts = fronts.map(f => f.siteName === oldName ? { ...f, siteName: name } : f);
            setFronts(updatedFronts);
          }}
          onDeleteSite={(idx) => {
            const siteToDelete = sites[idx];
            const newFronts = fronts.filter(f => f.siteName !== siteToDelete);
            setFronts(newFronts);
            const newSites = sites.filter((_, i) => i !== idx);
            setSites(newSites);
            if (idx === activeSiteIndex) setActiveSiteIndex(0);
            else if (idx < activeSiteIndex) setActiveSiteIndex(activeSiteIndex - 1);
          }}
        />
      )}
      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
      {isSOSOpen && <SOSModal onClose={() => setIsSOSOpen(false)} />}
    </div>
  );
};

// --- Sub-Components ---

const SignaturePad: React.FC<{ onEnd: (data: string) => void }> = ({ onEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // High DPI Canvas Setup
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Set the actual size in memory (scaled to account for extra pixel density)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Normalize coordinate system to use css pixels
      ctx.scale(dpr, dpr);
      
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3aaa82'; 
    };

    updateCanvasSize();
    
    // Optional: Resize observer could go here if layout is fluid
  }, []);

  const saveSignature = () => { 
    if(canvasRef.current) onEnd(canvasRef.current.toDataURL()); 
  }

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    let clientX, clientY;
    if ('touches' in e) { 
      clientX = e.touches[0].clientX; 
      clientY = e.touches[0].clientY; 
    } else { 
      clientX = (e as React.MouseEvent).clientX; 
      clientY = (e as React.MouseEvent).clientY; 
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => { setIsDrawing(false); saveSignature(); }

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    // Clear using the raw pixel dimensions
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center"><label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Firma del Supervisor</label><button onClick={clearCanvas} className="text-xs text-red-500 font-bold">Limpiar</button></div>
      <canvas 
        ref={canvasRef} 
        className="w-full h-40 bg-white dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl cursor-crosshair shadow-inner touch-none" 
        style={{ touchAction: 'none' }}
        onMouseDown={startDrawing} 
        onMouseUp={stopDrawing} 
        onMouseMove={draw} 
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} 
        onTouchEnd={stopDrawing} 
        onTouchMove={draw} 
      />
    </div>
  );
};

// --- Sub-Views ---

const ReportDetailView: React.FC<{ record: RoutineRecord, onBack: () => void, userCompany: string }> = ({ record, onBack, userCompany }) => {
  const handlePrint = () => {
    window.print();
  };

  const getSeverityColor = (s: Severity) => {
    switch(s) {
      case 'ALTA': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIA': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'BAJA': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionBadge = (a: ActionTaken) => {
    switch(a) {
      case 'CORREGIDO': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold uppercase"><span className="material-symbols-outlined text-[14px]">check</span> Corregido en Sitio</span>;
      case 'DETENIDO': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase"><span className="material-symbols-outlined text-[14px]">pan_tool</span> Trabajo Detenido</span>;
      case 'INSTRUIDO': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase"><span className="material-symbols-outlined text-[14px]">school</span> Personal Instruido</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-bold uppercase"><span className="material-symbols-outlined text-[14px]">schedule</span> Pendiente</span>;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-background-dark text-black dark:text-white h-full print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Header title="Vista de Documento" onBack={onBack} rightAction={<button onClick={handlePrint} className="bg-primary/10 text-primary p-2 rounded-lg font-bold text-xs uppercase flex items-center gap-1"><span className="material-symbols-outlined text-lg">print</span> PDF</button>} />
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar p-8 print:p-0 print:overflow-visible bg-gray-50 dark:bg-background-dark print:bg-white print:h-auto">
        
        {/* DOCUMENT CONTAINER (A4 Style) */}
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm print:shadow-none print:max-w-none print:p-0 print:w-full">
          
          {/* HEADER - No Logo */}
          <div className="flex justify-between items-end border-b-4 border-gray-900 pb-6 mb-8">
             <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Informe de Inspección</h1>
                <p className="text-xs text-gray-500 mt-2 font-bold tracking-widest uppercase">Seguridad Industrial & Salud Ocupacional</p>
             </div>
             <div className="text-right">
               <div className="bg-gray-100 px-3 py-1 rounded text-xs font-bold text-gray-600 mb-1">REF: {record.id}</div>
               <p className="text-sm font-bold">{new Date(record.date).toLocaleDateString()}</p>
             </div>
          </div>

          {/* META DATA GRID */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-sm">
             <div className="border-b pb-1">
               <p className="text-[10px] text-gray-400 uppercase font-bold">Empresa Supervisora</p>
               <p className="font-bold text-gray-900">{userCompany || 'No especificada'}</p>
             </div>
             <div className="border-b pb-1">
               <p className="text-[10px] text-gray-400 uppercase font-bold">Proyecto / Sitio</p>
               <p className="font-bold text-gray-900">{record.siteName}</p>
             </div>
             <div className="border-b pb-1">
               <p className="text-[10px] text-gray-400 uppercase font-bold">Frente Inspeccionado</p>
               <p className="font-bold text-gray-900">{record.frontName}</p>
             </div>
             <div className="border-b pb-1">
               <p className="text-[10px] text-gray-400 uppercase font-bold">Supervisor Responsable</p>
               <p className="font-bold text-gray-900">{record.supervisorName}</p>
             </div>
          </div>

          {/* SUMMARY BOX */}
          <div className={`p-4 rounded-lg mb-8 flex items-center justify-between ${record.statusResult === FrontStatus.CONTROLLED ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Resultado de Inspección</p>
              <p className={`text-3xl font-bold ${record.statusResult === FrontStatus.CONTROLLED ? 'text-green-700' : 'text-orange-700'}`}>{record.statusResult.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black text-gray-900">{Math.round((record.questionsChecked - record.deviations.length) / record.questionsChecked * 100)}%</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Cumplimiento</p>
            </div>
          </div>

          {/* FINDINGS TABLE - Horizontal Layout with Square Image */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 pb-2 border-b border-gray-100"><span className="material-symbols-outlined">warning</span> Hallazgos y Desviaciones</h3>
            
            {record.deviations.length > 0 ? (
              <div className="space-y-4">
                {record.deviations.map((d, i) => (
                  <div key={i} className="break-inside-avoid border border-gray-200 rounded-lg overflow-hidden flex flex-row shadow-sm print:shadow-none bg-white">
                     {/* Square Image Container - Fixed Width & Height */}
                     <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-100 shrink-0 relative border-r border-gray-200 print:w-40 print:h-40">
                        {d.photo ? (
                             <img src={d.photo} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                               <span className="material-symbols-outlined text-3xl">no_photography</span>
                               <span className="text-[10px] font-bold uppercase">Sin Foto</span>
                             </div>
                           )}
                        <div className="absolute top-2 left-2 bg-gray-900 text-white size-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md print:bg-black print:text-white">{i+1}</div>
                     </div>

                     {/* Content Side */}
                     <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between bg-gray-50/30 print:bg-white">
                        <div className="space-y-2">
                           <div className="flex justify-between items-start gap-2">
                              <p className="font-bold text-sm leading-tight text-gray-900">{d.questionText}</p>
                              <div className="shrink-0">{getActionBadge(d.actionTaken)}</div>
                           </div>
                           <div className="bg-white p-2 rounded border border-gray-200 print:border-gray-300">
                              <p className="text-xs text-gray-600 italic">"{d.description}"</p>
                           </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityColor(d.severity)}`}>Riesgo {d.severity}</span>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                 <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                 <p className="font-bold text-gray-900">Sin Hallazgos Reportados</p>
                 <p className="text-xs">El frente cumple con los estándares verificados en esta rutina.</p>
              </div>
            )}
          </div>

          {/* SIGNATURES - Now Guaranteed to Print at Bottom */}
          <div className="break-inside-avoid mt-12 pt-8 border-t-2 border-gray-100">
            <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="h-24 flex items-end justify-center pb-2 border-b border-gray-300 mb-2">
                     {record.supervisorSignature && <img src={record.supervisorSignature} className="h-full object-contain" />}
                  </div>
                  <p className="text-xs font-bold uppercase text-gray-900">{record.supervisorName}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Firma Supervisor SSO</p>
                </div>
                <div className="text-center">
                  <div className="h-24 border-b border-gray-300 mb-2"></div>
                  <p className="text-xs font-bold uppercase text-gray-900">Recibido por (Obra)</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nombre y Firma</p>
                </div>
            </div>
            <div className="mt-8 text-center">
               <p className="text-[10px] text-gray-300 uppercase tracking-widest">Generado digitalmente por Sigo Safety App • Cumplimiento Normativo AC 229-2014</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const ReportDeviationView: React.FC<{ question: Question, onConfirm: (d: Deviation) => void, onBack: () => void }> = ({ question, onConfirm, onBack }) => {
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [severity, setSeverity] = useState<Severity>('MEDIA');
  const [action, setAction] = useState<ActionTaken>('PENDIENTE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files?.[0]) {
      try {
        const compressed = await compressImage(e.target.files[0]);
        setPhoto(compressed);
      } catch(err) {
        alert("Error al procesar foto");
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-background-dark">
      <Header title="Reportar Hallazgo" onBack={onBack} />
      <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        
        {/* Contexto del Hallazgo */}
        <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-red-100 dark:border-red-500/20 shadow-sm">
          <p className="text-[10px] font-bold text-red-500 uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">warning</span> Desviación Detectada</p>
          <p className="font-bold text-lg leading-tight">{question.text}</p>
        </div>

        {/* 1. Evidencia */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">1. Evidencia Fotográfica</h3>
          <div className="relative">
            <button onClick={() => fileInputRef.current?.click()} className={`w-full h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 bg-white dark:bg-white/5 overflow-hidden transition-all ${photo ? 'border-primary' : 'border-gray-300 dark:border-white/10'}`}>
              {photo ? (
                <img src={photo} className="w-full h-full object-contain" />
              ) : (
                <>
                  <div className="size-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-gray-400">photo_camera</span>
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Tocar para tomar foto</p>
                </>
              )}
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </div>
        </div>

        {/* 2. Severidad */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">2. Nivel de Riesgo</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['BAJA', 'MEDIA', 'ALTA'] as Severity[]).map(sev => (
              <button 
                key={sev} 
                onClick={() => setSeverity(sev)}
                className={`py-3 rounded-xl text-xs font-bold border-2 transition-all ${severity === sev 
                  ? (sev === 'ALTA' ? 'bg-red-500 border-red-500 text-white' : sev === 'MEDIA' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-green-500 border-green-500 text-white') 
                  : 'bg-white dark:bg-white/5 border-transparent text-gray-400'}`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Acción Tomada */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">3. Acción Inmediata</h3>
          <div className="grid grid-cols-2 gap-2">
             <button onClick={() => setAction('CORREGIDO')} className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${action === 'CORREGIDO' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-transparent text-gray-500'}`}>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="text-xs font-bold">Corregido</span>
             </button>
             <button onClick={() => setAction('INSTRUIDO')} className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${action === 'INSTRUIDO' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-transparent text-gray-500'}`}>
                <span className="material-symbols-outlined text-lg">school</span>
                <span className="text-xs font-bold">Instruido</span>
             </button>
             <button onClick={() => setAction('DETENIDO')} className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${action === 'DETENIDO' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-transparent text-gray-500'}`}>
                <span className="material-symbols-outlined text-lg">pan_tool</span>
                <span className="text-xs font-bold">Detenido</span>
             </button>
             <button onClick={() => setAction('PENDIENTE')} className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${action === 'PENDIENTE' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-transparent text-gray-500'}`}>
                <span className="material-symbols-outlined text-lg">schedule</span>
                <span className="text-xs font-bold">Pendiente</span>
             </button>
          </div>
        </div>

        {/* 4. Descripción */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">4. Observaciones</h3>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-white dark:bg-white/5 rounded-2xl p-4 border dark:border-white/10 outline-none focus:ring-2 focus:ring-primary h-24 text-sm" placeholder="Detalles específicos..." />
        </div>

      </main>
      <div className="p-6 pb-12 shrink-0 bg-white dark:bg-card-dark shadow-lg border-t dark:border-white/5">
        <button onClick={() => photo && desc && onConfirm({ 
          questionId: question.id, 
          questionText: question.text, 
          description: desc, 
          photo, 
          date: new Date().toISOString(),
          severity,
          actionTaken: action
        })} className={`w-full h-14 rounded-xl font-bold text-lg shadow-lg text-white flex items-center justify-center gap-2 ${photo && desc ? 'bg-primary' : 'bg-gray-300 pointer-events-none'}`}>
          <span className="material-symbols-outlined">save</span>
          Guardar Reporte
        </button>
      </div>
    </div>
  );
};

const EditFrontNameView: React.FC<{ initialName: string, onSave: (n: string) => void, onBack: () => void }> = ({ initialName, onSave, onBack }) => {
  const [name, setName] = useState(initialName);
  return (
    <div className="flex flex-col flex-1">
      <Header title="Editar Nombre" onBack={onBack} />
      <div className="p-6 pt-12 space-y-8 flex-1">
        <h1 className="text-3xl font-bold">Actualizar nombre</h1>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Excavación Norte" className="w-full h-16 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark px-4 text-xl outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="p-6"><button onClick={() => name && onSave(name)} className={`w-full h-14 rounded-xl text-white font-bold text-lg ${name ? 'bg-primary' : 'bg-gray-300 pointer-events-none'}`}>Guardar</button></div>
    </div>
  );
};

const RiskMatrixView: React.FC<{ title: string, initialSelections: SelectedRisk[], onFinish: (risks: SelectedRisk[]) => void, onBack: () => void }> = ({ title, initialSelections, onFinish, onBack }) => {
  const [selections, setSelections] = useState<Record<string, RiskLevel>>(() => {
    const initial: Record<string, RiskLevel> = {};
    initialSelections.forEach(s => { initial[s.riskId] = s.level; });
    return initial;
  });

  const getLevelColor = (level: RiskLevel) => {
    switch(level) {
      case 'ALTO': return 'bg-red-600 border-red-600';
      case 'MEDIO': return 'bg-orange-500 border-orange-500';
      case 'BAJO': return 'bg-primary border-primary';
      default: return 'bg-gray-400 border-gray-400';
    }
  };

  const groupedRisks = RISK_CATALOG.reduce((acc, risk) => {
    if (!acc[risk.category]) acc[risk.category] = [];
    acc[risk.category].push(risk);
    return acc;
  }, {} as Record<string, RiskDefinition[]>);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        <div className="space-y-10 pb-24">
          {Object.entries(groupedRisks).map(([category, risks]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{category}</h3>
              {risks.map(risk => {
                const currentLevel = selections[risk.id] || 'NO_APLICA';
                return (
                  <div key={risk.id} className="bg-white dark:bg-card-dark rounded-2xl p-4 border dark:border-white/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center text-gray-500"><span className="material-symbols-outlined text-lg">{risk.icon}</span></div>
                      <h4 className="font-bold">{risk.name}</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['ALTO', 'MEDIO', 'BAJO', 'NO_APLICA'] as RiskLevel[]).map(lvl => (
                        <button key={lvl} onClick={() => setSelections({...selections, [risk.id]: lvl})} className={`py-2 rounded-lg text-[9px] font-bold transition-all border-2 ${currentLevel === lvl ? getLevelColor(lvl) + ' text-white' : 'bg-transparent border-gray-100 dark:border-white/5 text-gray-400'}`}>
                          {lvl.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed italic">{risk.options[currentLevel]}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent shrink-0"><button onClick={() => {
        const selected = Object.entries(selections).filter(([_, l]) => l !== 'NO_APLICA').map(([riskId, level]) => ({ riskId, level }));
        onFinish(selected);
      }} className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg">Guardar Matriz</button></div>
    </div>
  );
};

const FrontDetailView: React.FC<{ 
  front: WorkFront, 
  historyCount?: number, 
  onBack: () => void, 
  onDelete: (id: string) => void, 
  onEditName: () => void, 
  onEditRisks: () => void, 
  onStartRoutine: () => void,
  onViewHistory?: () => void 
}> = ({ front, historyCount = 0, onBack, onDelete, onEditName, onEditRisks, onStartRoutine, onViewHistory }) => (
  <div className="flex flex-col flex-1 pb-24 overflow-hidden">
    <Header title="Detalle del Frente" onBack={onBack} rightAction={<button onClick={() => onDelete(front.id)} className="text-red-500 size-10 flex items-center justify-center rounded-full"><span className="material-symbols-outlined">delete</span></button>} />
    <main className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6">
      
      {/* Tarjeta Principal (Nombre y Estado) */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm flex flex-col gap-3 border dark:border-white/5">
        <div className="flex flex-col gap-1">
           <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold leading-tight">{front.name}</h1>
              <button onClick={onEditName} className="p-2 text-primary hover:bg-primary/5 rounded-full"><span className="material-symbols-outlined">edit</span></button>
           </div>
           <div className="flex items-center gap-2">
             <span className={`size-3 rounded-full ${front.status === FrontStatus.CONTROLLED ? 'bg-primary' : 'bg-orange-500'}`} />
             <p className="text-xs font-bold text-gray-400 uppercase">{front.status}</p>
           </div>
        </div>

        {/* BOTÓN DE ACCESO A REPORTES (NUEVO) */}
        {onViewHistory && (
          <button 
            onClick={onViewHistory}
            className="w-full mt-2 py-3 px-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">history_edu</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-gray-900 dark:text-white">Expediente Digital</p>
                <p className="text-[10px] text-gray-500 uppercase">{historyCount} Reportes disponibles</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">chevron_right</span>
          </button>
        )}
      </div>

      <section className="space-y-4">
        <h3 className="font-bold text-lg px-1">EPP Requerido</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {front.epp.map(item => (
            <div key={item} className="flex min-w-max items-center gap-2 rounded-xl bg-primary/10 text-primary p-2 px-4 border border-primary/20"><span className="material-symbols-outlined text-sm">check_circle</span><span className="text-xs font-bold">{item}</span></div>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1"><h3 className="font-bold text-lg">Riesgos</h3><button onClick={onEditRisks} className="text-xs text-primary font-bold">Editar Riesgos</button></div>
        <div className="space-y-3">
          {front.selectedRisks.map(sr => {
            const riskDef = RISK_CATALOG.find(r => r.id === sr.riskId);
            return (
              <div key={sr.riskId} className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm flex items-start gap-4 border dark:border-white/5">
                <div className={`p-2 rounded-lg ${sr.level === 'ALTO' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}><span className="material-symbols-outlined">{riskDef?.icon}</span></div>
                <div className="flex-1"><p className="font-bold text-sm">{riskDef?.name} • <span className={sr.level === 'ALTO' ? 'text-red-500' : 'text-orange-500'}>{sr.level}</span></p><p className="text-[11px] text-gray-500 leading-tight">{riskDef?.options[sr.level]}</p></div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
    <div className="fixed bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent"><button onClick={onStartRoutine} className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg">Iniciar Rutina de Seguridad</button></div>
  </div>
);

const RoutineStepView: React.FC<{ questions: Question[], step: number, front: WorkFront, onNext: (hasRisk: boolean) => void, onCancel: () => void }> = ({ questions, step, front, onNext, onCancel }) => {
  const q = questions[step];
  if (!q) return null;
  const isEPPCheck = q.id === 'epp_check';
  const progress = ((step + 1) / questions.length) * 100;
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="flex items-center justify-between p-4 h-16 shrink-0">
        <button onClick={onCancel} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><span className="material-symbols-outlined">close</span></button>
        <div className="h-1.5 w-32 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        <div className="size-10" />
      </header>
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-md"><img src={q.image} className="w-full h-full object-cover" /></div>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full"><span className="material-symbols-outlined text-sm">{q.icon}</span><span className="text-[10px] font-bold uppercase">{q.category}</span></div>
          <h2 className="text-2xl font-bold leading-tight">{q.text}</h2>
          <p className="text-gray-500 text-base">{q.subtext}</p>
        </div>
        {isEPPCheck && (
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border dark:border-white/10 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Equipo a verificar:</p>
            <div className="flex flex-wrap gap-2">{front.epp.map(e => <span key={e} className="text-xs bg-white dark:bg-white/5 px-2 py-1 rounded-md border dark:border-white/10 font-bold">{e}</span>)}</div>
          </div>
        )}
      </div>
      <div className="p-6 pt-0 flex flex-col gap-3 pb-12 shrink-0">
        <button onClick={() => onNext(false)} className="w-full h-20 bg-primary text-white rounded-2xl font-bold text-xl shadow-lg flex items-center justify-between px-6 active:scale-[0.98]"><span>{isEPPCheck ? 'CONFIRMAR EPP' : 'SÍ, está bien'}</span><span className="material-symbols-outlined">check_circle</span></button>
        <button onClick={() => onNext(true)} className="w-full h-20 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-transparent rounded-2xl font-bold text-xl flex items-center justify-between px-6 active:scale-[0.98]"><span>NO, reportar</span><span className="material-symbols-outlined">warning</span></button>
      </div>
    </div>
  );
};

const ProfileView: React.FC<{ user: User, isDarkMode: boolean, onToggleDarkMode: () => void, onBack: () => void, onLogout: () => void, onUpdateUser: (u: User) => void }> = ({ user, isDarkMode, onToggleDarkMode, onBack, onLogout, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
      }
      setIsCompressing(true);
      try {
        const compressedBase64 = await compressImage(file);
        onUpdateUser({ ...user, photo: compressedBase64 });
        setEditedUser(prev => ({ ...prev, photo: compressedBase64 }));
      } catch (error) {
        console.error("Error compressing image:", error);
        alert("Error al procesar la imagen. Intenta con otra.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-background-light dark:bg-background-dark overflow-y-auto no-scrollbar pb-12">
      <Header title="Mi Perfil" onBack={onBack} rightAction={!isEditing ? <button onClick={() => setIsEditing(true)} className="text-primary font-bold">Editar</button> : <button onClick={() => { onUpdateUser(editedUser); setIsEditing(false); }} className="text-primary font-bold">Listo</button>} />
      <div className="p-8 flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="size-32 rounded-full border-4 border-white dark:border-white/10 shadow-xl overflow-hidden bg-gray-100 dark:bg-card-dark flex items-center justify-center relative">
            {isCompressing ? (
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
            ) : (
              user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-white/20">person</span>
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 size-10 bg-primary text-white rounded-full flex items-center justify-center border-4 border-background-light dark:border-background-dark shadow-lg"><span className="material-symbols-outlined text-[20px]">photo_camera</span></button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
        {isEditing ? <input className="text-center text-2xl font-bold bg-transparent border-b border-primary/30 outline-none w-full" value={editedUser.name} onChange={e => setEditedUser({...editedUser, name: e.target.value})} placeholder="Tu Nombre" /> : <h2 className="text-2xl font-bold">{user.name || 'Supervisor'}</h2>}
      </div>
      <div className="px-5 space-y-6">
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm space-y-4 border dark:border-white/5">
          <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Empresa</label>{isEditing ? <input className="font-bold bg-gray-50 dark:bg-white/5 p-2 rounded-lg outline-none" value={editedUser.company} onChange={e => setEditedUser({...editedUser, company: e.target.value})} /> : <p className="font-bold">{user.company || 'Constructora'}</p>}</div>
          <div className="h-px bg-gray-100 dark:bg-white/5 w-full" />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp para Reportes</label>
            <div className="flex items-center gap-2">
              {isEditing ? <input className="flex-1 font-bold bg-gray-50 dark:bg-white/5 p-2 rounded-lg outline-none" value={editedUser.phone} onChange={e => setEditedUser({...editedUser, phone: e.target.value})} placeholder="+502 0000 0000" /> : <p className="font-bold">{user.phone || '+502'}</p>}
            </div>
          </div>
          <div className="h-px bg-gray-100 dark:bg-white/5 w-full" />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Correo Electrónico</label>
            {isEditing ? <input className="font-bold bg-gray-50 dark:bg-white/5 p-2 rounded-lg outline-none" value={editedUser.email} onChange={e => setEditedUser({...editedUser, email: e.target.value})} placeholder="correo@ejemplo.com" /> : <p className="font-bold">{user.email || 'No asignado'}</p>}
          </div>
        </div>
        <div onClick={onToggleDarkMode} className="flex items-center justify-between p-4 bg-white dark:bg-card-dark rounded-xl shadow-sm cursor-pointer border dark:border-white/5"><div className="flex items-center gap-3"><span className="material-symbols-outlined">dark_mode</span><span className="font-bold text-sm">Modo Oscuro</span></div><div className={`w-12 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}><div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`} /></div></div>
        
        {/* NUEVO BOTÓN PARA COMENTARIOS */}
        <a href="mailto:ventas@sigo.com.gt?subject=Sugerencia%20de%20Mejora%20-%20Sigo%20App" className="flex items-center justify-between p-4 bg-white dark:bg-card-dark rounded-xl shadow-sm cursor-pointer border dark:border-white/5">
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">mail</span>
                <span className="font-bold text-sm">Enviar Comentario</span>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
        </a>

        <button onClick={onLogout} className="w-full py-4 text-red-500 font-bold flex items-center justify-center gap-2 mt-4"><span className="material-symbols-outlined">logout</span> Cerrar Sesión</button>
      </div>
    </div>
  );
};

const SiteManager: React.FC<{ 
  sites: string[], 
  fronts: WorkFront[],
  activeIndex: number, 
  onClose: () => void, 
  onSelectSite: (idx: number) => void, 
  onAddSite: (name: string) => void, 
  onEditSite: (idx: number, name: string) => void,
  onDeleteSite: (idx: number) => void
}> = ({ sites, fronts, activeIndex, onClose, onSelectSite, onAddSite, onEditSite, onDeleteSite }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-card-dark w-full rounded-t-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[80vh]">
        {confirmDeleteIndex !== null ? (
          <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="size-20 rounded-full bg-red-100 dark:bg-red-500/20 text-red-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">¿Eliminar Sitio?</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Estás a punto de borrar <span className="font-bold text-gray-900 dark:text-white">"{sites[confirmDeleteIndex]}"</span>.
              </p>
              <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
                 <p className="text-red-600 dark:text-red-400 font-bold text-sm">
                   Se eliminarán {fronts.filter(f => f.siteName === sites[confirmDeleteIndex] || (!f.siteName && sites[confirmDeleteIndex] === sites[0])).length} frentes de trabajo asociados.
                 </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => { onDeleteSite(confirmDeleteIndex); setConfirmDeleteIndex(null); }} 
                className="w-full h-14 bg-red-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-red-600 transition-colors"
              >
                Sí, Eliminar Todo
              </button>
              <button 
                onClick={() => setConfirmDeleteIndex(null)} 
                className="w-full h-14 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl font-bold text-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-8 shrink-0" />
            <h2 className="text-2xl font-bold mb-6 shrink-0">Gestionar Sitios</h2>
            
            <div className="space-y-3 mb-8 overflow-y-auto no-scrollbar">
              {sites.map((s, idx) => {
                const isEditingThis = editingIndex === idx;
                const frontCount = fronts.filter(f => f.siteName === s || (!f.siteName && s === sites[0])).length;
                const isLastSite = sites.length <= 1;

                return (
                  <div key={idx} className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${idx === activeIndex ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-50 dark:bg-white/5'}`}>
                    {isEditingThis ? (
                       <div className="flex-1 flex gap-2">
                         <input 
                           autoFocus 
                           value={editValue} 
                           onChange={e => setEditValue(e.target.value)} 
                           className="flex-1 bg-white dark:bg-black/20 p-2 rounded-lg outline-none text-sm font-bold border border-primary" 
                         />
                         <button onClick={() => { if(editValue) { onEditSite(idx, editValue); setEditingIndex(null); } }} className="p-2 bg-primary text-white rounded-lg"><span className="material-symbols-outlined text-sm">check</span></button>
                         <button onClick={() => setEditingIndex(null)} className="p-2 bg-gray-200 dark:bg-white/10 text-gray-500 rounded-lg"><span className="material-symbols-outlined text-sm">close</span></button>
                       </div>
                    ) : (
                      <>
                        <div className="flex-1 flex flex-col cursor-pointer" onClick={() => onSelectSite(idx)}>
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${idx === activeIndex ? 'text-primary' : 'text-gray-400'}`}>location_on</span>
                            <span className="font-bold truncate">{s}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 pl-6">{frontCount} frentes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingIndex(idx); setEditValue(s); }} className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"><span className="material-symbols-outlined text-sm">edit</span></button>
                          <button 
                            disabled={isLastSite}
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteIndex(idx); }} 
                            className={`p-2 rounded-lg transition-colors ${isLastSite ? 'text-gray-200 dark:text-white/5 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'}`}
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              
              {isAdding ? (
                <div className="flex gap-2 p-2 bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-primary border-dashed">
                  <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} className="bg-transparent p-2 rounded-xl flex-1 outline-none text-sm font-bold" placeholder="Nombre de nueva obra..." />
                  <button onClick={() => { if(inputValue) { onAddSite(inputValue); setIsAdding(false); setInputValue(''); } }} className="bg-primary text-white p-2 px-4 rounded-xl font-bold text-xs">OK</button>
                  <button onClick={() => setIsAdding(false)} className="text-gray-400 p-2"><span className="material-symbols-outlined">close</span></button>
                </div>
              ) : (
                <button onClick={() => setIsAdding(true)} className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl text-gray-400 font-bold text-sm uppercase hover:border-primary hover:text-primary transition-colors">+ Nueva Obra</button>
              )}
            </div>
            
            <button onClick={onClose} className="w-full h-14 bg-gray-100 dark:bg-white/5 rounded-2xl font-bold uppercase tracking-widest text-sm shrink-0 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cerrar</button>
          </>
        )}
      </div>
    </div>
  );
};

const AboutModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 print:hidden">
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-50 duration-300 flex flex-col items-center text-center gap-6">
      <div className="size-24 rounded-2xl overflow-hidden shadow-lg">
         <img src="https://sigo-cdn.b-cdn.net/logos/%5BPequen%CC%83o%5D%20Logo%20Sigo%20Cuadrado%20CMYK.jpeg" alt="Sigo Logo" className="w-full h-full object-cover" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sigo Safety</h2>
        <p className="text-primary font-bold text-sm uppercase tracking-widest">Simplificamos la Seguridad Industrial</p>
      </div>

      <div className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
          Transformamos la normativa compleja en hábitos simples. Tu aliado estratégico para crear entornos de trabajo más seguros y eficientes.
        </p>
        
        <p className="text-gray-400 dark:text-gray-500 text-xs font-medium">
          Explora nuestras soluciones profesionales en:
        </p>
      </div>

      <a 
        href="https://www.sigo.com.gt" 
        target="_blank" 
        rel="noopener noreferrer"
        className="w-full py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors"
      >
        www.sigo.com.gt
      </a>

      <button onClick={onClose} className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 hover:text-gray-600 dark:hover:text-gray-200">
        Cerrar
      </button>
    </div>
  </div>
);

const SOSModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center p-6 print:hidden">
    <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col gap-4">
      <div className="flex items-center gap-3 text-red-600 dark:text-red-500 pb-2 border-b dark:border-white/10">
        <span className="material-symbols-outlined text-3xl filled">sos</span>
        <h2 className="text-2xl font-black uppercase tracking-tight">Emergencia</h2>
      </div>
      
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Acciones inmediatas para situaciones críticas en obra.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <a href="tel:122" className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl border-2 border-red-100 dark:border-red-500/20 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-3xl text-red-600 mb-1">local_fire_department</span>
          <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">Bomberos</span>
          <span className="text-[10px] font-black text-red-900 dark:text-red-300">122</span>
        </a>
        <a href="tel:110" className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border-2 border-blue-100 dark:border-blue-500/20 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-3xl text-blue-600 mb-1">local_police</span>
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Policía</span>
          <span className="text-[10px] font-black text-blue-900 dark:text-blue-300">110</span>
        </a>
      </div>

      <button className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center gap-2 font-bold text-gray-700 dark:text-white active:scale-95 transition-transform">
        <span className="material-symbols-outlined">share_location</span>
        Compartir Ubicación Actual
      </button>

      <button onClick={onClose} className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 hover:text-gray-600 dark:hover:text-gray-200">
        Cancelar
      </button>
    </div>
  </div>
);

const WelcomeView: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="flex flex-col flex-1 pb-24 overflow-hidden relative">
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2">
      <div className="flex items-center px-4 py-4 justify-center">
        <div className="flex items-center gap-3">
          <img src="https://sigo-cdn.b-cdn.net/logos/%5BPequen%CC%83o%5D%20Logo%20Sigo%20Cuadrado%20CMYK.jpeg" alt="Logo" className="h-10 w-10 rounded-[6px] object-cover" />
          <h2 className="text-xl font-bold">Sigo Safety</h2>
        </div>
      </div>
      <div className="w-full aspect-[4/3] rounded-2xl bg-cover bg-center mb-6 shadow-lg overflow-hidden relative" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1541913057814-fa06e1470438?q=80&w=2070&auto=format&fit=crop")' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="flex flex-col gap-2 mb-6 px-2">
        <h1 className="text-3xl font-bold leading-tight">Tu Copiloto de <span className="text-primary">Seguridad</span></h1>
        <p className="text-gray-500">Gestión inteligente Multi-Norma en tiempo real.</p>
      </div>
      <div className="flex flex-col gap-3 px-2 pb-6">
        <div className="flex items-start gap-4 p-3 rounded-xl bg-primary/5 border border-primary/10"><span className="material-symbols-outlined text-primary">security</span><div><p className="font-bold text-sm">Salud y Seguridad (SSO)</p><p className="text-[10px] text-gray-500 uppercase">AC 229-2014 | AC 33-2016</p></div></div>
        <div className="flex items-start gap-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10"><span className="material-symbols-outlined text-orange-500">campaign</span><div><p className="font-bold text-sm">Desastres y Emergencias</p><p className="text-[10px] text-gray-500 uppercase">NRD2 CONRED | NFPA 241</p></div></div>
      </div>
    </div>
    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark z-10">
      <button onClick={onStart} className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">Empezar <span className="material-symbols-outlined">arrow_forward</span></button>
    </div>
  </div>
);

const RegistrationView: React.FC<{ user: User, onSave: (u: User) => void }> = ({ user, onSave }) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  return (
    <div className="flex flex-col flex-1 pb-24 relative overflow-hidden">
      <Header title="Registro Inicial" />
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
        <div className="space-y-2"><h1 className="text-2xl font-bold">Datos del Supervisor</h1><p className="text-gray-500">Ingresa tu información para personalizar tus reportes.</p></div>
        <div className="space-y-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Juan Pérez" className="w-full h-14 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark px-4 outline-none focus:ring-2 focus:ring-primary" />
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Ej: Constructora San José" className="w-full h-14 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark px-4 outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark z-10">
        <button onClick={() => name && company && onSave({ ...user, name, company, role: 'Supervisor de Seguridad' })} className={`w-full h-14 rounded-xl text-white font-bold text-lg shadow-lg ${name && company ? 'bg-primary' : 'bg-gray-300 pointer-events-none'}`}>Continuar</button>
      </div>
    </div>
  );
};

const RoutineFinishView: React.FC<{ onSave: (sig: string) => void }> = ({ onSave }) => {
  const [signature, setSignature] = useState('');
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Finalizar Registro" />
      <main className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col space-y-10">
        <div className="text-center space-y-4 pt-4">
          <div className="size-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-4xl filled">verified</span></div>
          <div><h1 className="text-2xl font-bold">¡Rutina Completada!</h1><p className="text-gray-500 text-sm">Registro preventivo alineado al AC 229-2014.</p></div>
        </div>
        <SignaturePad onEnd={setSignature} />
      </main>
      <div className="p-6 pb-12 shrink-0"><button onClick={() => signature && onSave(signature)} className={`w-full h-14 rounded-xl font-bold text-lg shadow-lg text-white ${signature ? 'bg-primary' : 'bg-gray-300 pointer-events-none'}`}>Finalizar y Guardar</button></div>
    </div>
  );
};

const HistoryView: React.FC<{ records: RoutineRecord[], onBack: () => void, onSelect: (r: RoutineRecord) => void, onDelete?: (id: string) => void }> = ({ records, onBack, onSelect, onDelete }) => (
  <div className="flex flex-col flex-1 overflow-hidden">
    <Header title="Historial" onBack={onBack} />
    <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full opacity-50 gap-4">
            <span className="material-symbols-outlined text-5xl">history</span>
            <p className="font-bold text-sm">No hay reportes disponibles.</p>
        </div>
      ) : (
        records.map(r => (
          <div key={r.id} className="relative group">
            <div onClick={() => onSelect(r)} className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border dark:border-white/5 flex flex-col gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
              <div className="flex justify-between items-start pr-8">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(r.date).toLocaleDateString()} • {new Date(r.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <h3 className="font-bold">{r.frontName}</h3>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${r.statusResult === FrontStatus.CONTROLLED ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500'}`}>{r.statusResult === FrontStatus.CONTROLLED ? 'OK' : 'Hallazgos'}</span>
              </div>
              <p className="text-xs text-gray-500">{r.siteName}</p>
            </div>
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(r.id); }} 
                className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all z-10"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            )}
          </div>
        ))
      )}
    </div>
  </div>
);

const HomeView: React.FC<{ user: User, fronts: WorkFront[], activeSite: string, onOpenSiteManager: () => void, onShowAbout: () => void, onSelectFront: (f: WorkFront) => void, onCreateFront: () => void, onProfile: () => void, onHistory: () => void, onFilterList: (filter: 'ALL' | 'REVISED' | 'PENDING') => void, onSOS: () => void }> = ({ user, fronts, activeSite, onOpenSiteManager, onShowAbout, onSelectFront, onCreateFront, onProfile, onHistory, onFilterList, onSOS }) => {
  const revisedCount = fronts.filter(f => f.status === FrontStatus.CONTROLLED).length;
  const pendingCount = fronts.filter(f => f.status !== FrontStatus.CONTROLLED).length;
  return (
    <div className="flex flex-col flex-1 pb-12">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 h-16 shrink-0 print:hidden">
        <div className="size-10 flex items-center justify-center cursor-pointer active:scale-95 transition-transform" onClick={onShowAbout}>
           <img src="https://sigo-cdn.b-cdn.net/logos/%5BPequen%CC%83o%5D%20Logo%20Sigo%20Cuadrado%20CMYK.jpeg" alt="Sigo" className="h-10 w-10 rounded-[6px] object-cover shadow-sm" />
        </div>
        <div className="flex-1 px-3 text-center cursor-pointer" onClick={onOpenSiteManager}>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Sitio Activo</p>
          <div className="flex items-center justify-center gap-1"><h2 className="font-bold truncate max-w-[150px]">{activeSite}</h2><span className="material-symbols-outlined text-primary text-sm">unfold_more</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSOS} className="size-9 rounded-full bg-red-50 text-red-600 border border-red-100 dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-500 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-xl filled">sos</span>
           </button>
          <button onClick={onProfile} className="size-10 rounded-full overflow-hidden bg-gray-200 border border-primary/20 shadow-sm">
            {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined">person</span></div>}
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-5 pt-4"><h1 className="text-3xl font-bold">Hola, {user.name ? user.name.split(' ')[0] : 'Supervisor'}</h1></div>
        <div className="flex gap-3 px-5 py-4 overflow-x-auto no-scrollbar">
          <div onClick={() => onFilterList('REVISED')} className="flex-1 min-w-[140px] p-5 bg-white dark:bg-card-dark rounded-2xl shadow-sm border-b-4 border-primary active:scale-95 transition-all cursor-pointer">
            <p className="text-xs font-bold text-gray-500 uppercase">Revisados</p><p className="text-3xl font-bold text-primary">{revisedCount}</p>
          </div>
          <div onClick={() => onFilterList('PENDING')} className="flex-1 min-w-[140px] p-5 bg-white dark:bg-card-dark rounded-2xl shadow-sm border-b-4 border-orange-500 active:scale-95 transition-all cursor-pointer">
            <p className="text-xs font-bold text-gray-500 uppercase">Pendientes</p><p className="text-3xl font-bold text-orange-500">{pendingCount}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 pt-4 mb-2"><h3 className="text-xl font-bold">Frentes de Trabajo</h3><button onClick={onCreateFront} className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold uppercase">+ Nuevo</button></div>
        {fronts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-4 opacity-50"><span className="material-symbols-outlined text-6xl">engineering</span><p className="font-bold text-lg">Aún no hay frentes creados.</p></div>
        ) : (
          <div className="px-4 space-y-2">
            {fronts.map(f => (
              <div key={f.id} onClick={() => onSelectFront(f)} className={`p-4 bg-white dark:bg-card-dark rounded-xl shadow-sm border-l-4 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-white/5 ${f.status === FrontStatus.CONTROLLED ? 'border-primary' : 'border-orange-500'}`}>
                <div><p className="font-bold">{f.name}</p><p className="text-xs text-gray-500">{f.lastReview}</p></div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const FrontListView: React.FC<{ fronts: WorkFront[], filter: 'ALL' | 'REVISED' | 'PENDING', onBack: () => void, onSelectFront: (f: WorkFront) => void }> = ({ fronts, filter, onBack, onSelectFront }) => {
  const filteredFronts = fronts.filter(f => {
    if (filter === 'REVISED') return f.status === FrontStatus.CONTROLLED;
    if (filter === 'PENDING') return f.status !== FrontStatus.CONTROLLED;
    return true;
  });

  const titleMap = {
    'ALL': 'Todos los Frentes',
    'REVISED': 'Frentes Revisados',
    'PENDING': 'Pendientes de Revisión'
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={titleMap[filter]} onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        {filteredFronts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 gap-4">
             <span className="material-symbols-outlined text-5xl">folder_off</span>
             <p className="font-bold text-sm">No se encontraron frentes.</p>
          </div>
        ) : (
          filteredFronts.map(f => (
            <div key={f.id} onClick={() => onSelectFront(f)} className={`bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border-l-4 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-white/5 ${f.status === FrontStatus.CONTROLLED ? 'border-primary' : 'border-orange-500'}`}>
              <div className="flex flex-col">
                <span className="font-bold">{f.name}</span>
                <span className="text-[10px] text-gray-500">{f.lastReview}</span>
              </div>
              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CreateFrontNameView: React.FC<{ onNext: (n: string) => void, onBack: () => void }> = ({ onNext, onBack }) => {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col flex-1 pb-24 relative overflow-hidden">
      <Header title="Identificación del Frente" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-4 space-y-8">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Nombre del Frente</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Ingresa el nombre con el que vamos a identificar este frente de trabajo que vas a supervisar.
          </p>
          
          <div className="relative">
            <input 
              autoFocus 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ej: Equipo Electricistas - PDA" 
              className="w-full h-16 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark px-4 text-xl outline-none focus:border-primary transition-colors shadow-sm" 
            />
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase px-1">Sugerencias profesionales:</p>
              <p className="text-[11px] text-gray-400 px-1 italic">
                Soldadura - Estructura Metálica, Excavación - Muro Perimetral, Acabados - Torre A.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-primary filled text-3xl">lightbulb</span>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-primary">¿Qué es un frente?</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Un frente es un equipo de personas o una zona específica que realiza tareas determinadas. Al identificarlo, el sistema asignará riesgos y EPP específicos que tú supervisarás.
            </p>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark z-10">
        <button 
          onClick={() => name && onNext(name)} 
          className={`w-full h-14 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${name ? 'bg-primary scale-100' : 'bg-gray-300 scale-95 pointer-events-none'}`}
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

export default App;