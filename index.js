import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Trophy, UserPlus, Trash2, ArrowLeft, AlertCircle, Banknote, Check, Sparkles, Bot, Shuffle, HelpCircle, Share2, Globe } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states for creating event
  const [formData, setFormData] = useState({
    title: 'Partido 6*6',
    date: '',
    time: '23:00',
    location: 'Club Dominica Sport',
    maxPlayers: 14,
    quota: 3000
  });

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubEvent = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'eventDetails', 'current'), 
      (docSnap) => {
        if (docSnap.exists()) {
          setEventDetails(docSnap.data());
        } else {
          setEventDetails(null);
        }
      },
      (error) => console.error("Error fetching event:", error)
    );

    const unsubPlayers = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'players'),
      (snap) => {
        const p = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPlayers(p.sort((a, b) => a.createdAt - b.createdAt));
        setLoading(false);
      },
      (error) => console.error("Error fetching players:", error)
    );

    return () => {
      unsubEvent();
      unsubPlayers();
    };
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    const newEvent = {
      ...formData,
      maxPlayers: parseInt(formData.maxPlayers) || 14,
      quota: parseInt(formData.quota) || 0,
      organizerId: user.uid
    };

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'eventDetails', 'current'), newEvent);
    
    players.forEach(async (p) => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id));
    });
  };

  const handleJoinMatch = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!playerName.trim()) {
      setPlayerError('Por favor, ingresa tu nombre.');
      return;
    }
    if (players.length >= eventDetails.maxPlayers) {
      setPlayerError('¡El partido ya está lleno!');
      return;
    }
    if (players.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      setPlayerError('Ya hay un jugador con ese nombre.');
      return;
    }

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), {
      name: playerName.trim(),
      status: 'Pendiente',
      createdAt: Date.now(),
      userId: user.uid
    });
    
    setPlayerName('');
    setPlayerError('');
  };

  const removePlayer = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', id));
  };

  const togglePaymentStatus = async (id, currentStatus) => {
    if (!user) return;
    const newStatus = currentStatus === 'Pendiente' ? 'Confirmado' : 'Pendiente';
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', id), {
      status: newStatus
    });
  };

  const resetEvent = async () => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'eventDetails', 'current'));
  };

  const copyShareLink = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
        return;
      }
    } catch (err) {
      console.warn("Clipboard API failed, trying fallback", err);
    }

    // Método alternativo infalible para navegadores o iframes estrictos
    try {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } else {
        prompt("Copia este enlace para compartir tu partido:", shareUrl);
      }
    } catch (e) {
      console.error('Fallback copy failed', e);
      prompt("Copia este enlace para compartir tu partido:", shareUrl);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // --- Vista del Organizador (Crear Evento) ---
  if (!eventDetails) {
    return (
      <div className="min-h-screen bg-green-50 text-slate-800 p-4 md:p-8 font-sans">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white text-center">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-green-100" />
            <h1 className="text-2xl font-bold">Crear Partido</h1>
            <p className="text-green-100 text-sm mt-1">Organiza tu próximo encuentro</p>
          </div>
          
          <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Evento</label>
              <input 
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                placeholder="Ej. Pichanga del Fin de Semana"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="date" 
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="time" 
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lugar / Cancha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="¿Dónde jugarán?"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Límite de Jugadores</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="number" 
                  name="maxPlayers"
                  value={formData.maxPlayers}
                  onChange={handleInputChange}
                  min="2"
                  max="30"
                  required
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cuota por Jugador ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Banknote className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="number" 
                  name="quota"
                  value={formData.quota}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg flex justify-center items-center gap-2"
            >
              Generar Evento <ArrowLeft className="h-5 w-5 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Vista Pública (Inscripción de Jugadores) ---
  const isFull = players.length >= eventDetails.maxPlayers;
  const progressPercentage = (players.length / eventDetails.maxPlayers) * 100;
  
  const isOrganizer = user && eventDetails.organizerId === user.uid;
  const totalCollected = players.filter(p => p.status === 'Confirmado').length * (eventDetails.quota || 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Cloud Status Banner */}
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 animate-pulse text-emerald-200" />
            <div>
              <p className="text-sm font-bold">¡Guardado en la Nube!</p>
              <p className="text-xs text-emerald-100">Tus datos se actualizan automáticamente en tiempo real.</p>
            </div>
          </div>
          <button
            onClick={copyShareLink}
            className="bg-white/25 hover:bg-white/35 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            {copiedLink ? '¡Enlace copiado!' : 'Compartir Partido'}
          </button>
        </div>

        {/* Event Header Card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden relative border border-slate-200">
          {isOrganizer && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
               <button 
                  onClick={resetEvent}
                  className="text-white/90 hover:text-white text-xs bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md transition-all font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Terminar Evento
                </button>
            </div>
          )}
          <div className="bg-[url('https://images.unsplash.com/photo-1518605368461-1e1e38ce8058?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center h-48 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 to-green-900/40 flex flex-col justify-end p-6 text-white">
              <h1 className="text-3xl font-bold mb-2 shadow-sm">{eventDetails.title}</h1>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="bg-green-100 p-2 rounded-lg text-green-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Fecha</p>
                <p className="font-semibold text-slate-700">{eventDetails.date || 'Por definir'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-slate-600">
              <div className="bg-green-100 p-2 rounded-lg text-green-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Hora</p>
                <p className="font-semibold text-slate-700">{eventDetails.time} hrs</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-600 md:col-span-2 mt-2">
              <div className="bg-green-100 p-2 rounded-lg text-green-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Lugar</p>
                <p className="font-semibold text-slate-700">{eventDetails.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-600 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-400">Cuota de Inscripción</p>
                  <p className="font-bold text-emerald-600 text-lg">${eventDetails.quota}</p>
                </div>
                {isOrganizer && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-400">Recaudado</p>
                    <p className="font-bold text-slate-700">${totalCollected}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inscription Form */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                Unirse al Partido
              </h2>
              
              <form onSubmit={handleJoinMatch} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Tu Nombre</label>
                  <input 
                    type="text" 
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      setPlayerError('');
                    }}
                    disabled={isFull}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                
                {playerError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    {playerError}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isFull}
                  className={`w-full font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm flex justify-center items-center gap-2
                    ${isFull 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-md'
                    }`}
                >
                  {isFull ? 'Cupos Llenos' : 'Inscribirme'}
                </button>
              </form>
            </div>
          </div>

          {/* Player List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Jugadores Inscritos
                </h2>
                <div className="text-right">
                  <span className="text-2xl font-black text-green-600">{players.length}</span>
                  <span className="text-slate-400 font-medium text-sm"> / {eventDetails.maxPlayers}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-green-500'}`} 
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>

              {players.length === 0 ? (
                <div className="text-center py
