import { BrowserRouter as Router } from "react-router-dom";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import UserContext from "./UserContext";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-tooltip/dist/react-tooltip.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import SocketConnection from "./services/socket"
import ScrollToTop from "./components/ScrollToTop";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Footer from "./components/Footer";
import {disableReactDevTools} from '@fvilers/disable-react-devtools';
import sound from "./services/sound";
import LevelUpCelebration from "./components/LevelUpCelebration";

const Header = lazy(() => import("./components/header/index"));
const AppRoutes = lazy(() => import("./Routes"));
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const environment = import.meta.env.VITE_NODE_ENV || "";
import { User } from './components/Types'

interface userDataSocketProps {
  walletBalance: number;
  xp: number;
  level: number;
}

function App() {
  const { t } = useTranslation();
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [userData, setUserData] = useState<User | null>(null);
  const [recentCaseOpenings, setRecentCaseOpenings] = useState<any>([]);
  const [openUserFlow, setOpenUserFlow] = useState<boolean>(false);
  const [joinedRoom, setJoinedRoom] = useState<boolean>(false);
  const [notification, setNotification] = useState<any>();

  const socket = SocketConnection.getInstance();

  if(environment == "production"){
    disableReactDevTools();
  }

  const userDataSocket = () => {
    socket.on("userDataUpdated", (payload: userDataSocketProps) => {
      setUserData(prevUserData => prevUserData ? {
        ...prevUserData,
        walletBalance: payload.walletBalance,
        xp: payload.xp,
        level: payload.level
      } : null);
    });

    return () => {
      socket.off("userDataUpdated");
    };
  }

  useEffect(() => {
    socket.on("onlineUsers", (count) => {
      setOnlineUsers(count);
    });

    socket.on("caseOpened", (data) => {
      data.timestamp = Date.now();

      // Wait 7.5 seconds to show the notification
      setTimeout(() => {
        setRecentCaseOpenings((prevOpenings: any) => [data, ...prevOpenings]);
      }, 7500);
    });

    userDataSocket();

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (userData && userData.id && !joinedRoom) {
      // reconnect so the handshake re-runs with the now-available token; the
      // server authenticates it and joins this user's private room
      socket.disconnect();
      socket.connect();
      setJoinedRoom(true);
    }
  }, [joinedRoom, socket, userData]);

  useEffect(() => {
    socket.on("newNotification", (notification) => {
      setNotification(notification);
    });

    return () => {
      socket.off("newNotification");
    };
  }, [socket]);

  useEffect(() => {
    socket.on("missionComplete", (data: { key: string; reward: number }) => {
      sound.play("bonus");
      toast.success(`🎯 +$${data.reward} — ${t("ux.missionDone")}`, {
        theme: "dark",
      });
    });

    return () => {
      socket.off("missionComplete");
    };
  }, [socket, t]);

  // Level-up celebration: fire when the level increases during the session.
  const prevLevel = useRef<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  useEffect(() => {
    const level = userData?.level;
    if (typeof level !== "number") {
      prevLevel.current = null;
      return;
    }
    if (prevLevel.current !== null && level > prevLevel.current) {
      setLevelUp(level);
      sound.play("levelUp");
    }
    prevLevel.current = level;
  }, [userData?.level]);
  const closeLevelUp = useCallback(() => setLevelUp(null), []);

  // Responsible play: gentle reminder every hour of continuous session.
  useEffect(() => {
    if (!isLogged) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const minutes = Math.round((Date.now() - startedAt) / 60000);
      sound.play("notify");
      toast.info(t("ux.sessionReminder", { minutes }), { theme: "dark", autoClose: 10000 });
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [isLogged, t]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token !== null) {
      setIsLogged(true);
    }
  }, [isLogged]);

  const toggleLogin = () => {
    setIsLogged(!isLogged);
  };

  const toogleUserData = (data: any) => {
    setUserData(data);
  };

  const toogleUserFlow = (state: boolean) => {
    setOpenUserFlow(state);
  }

  //if there's more than 20 items, remove the last one from the array
  useEffect(() => {
    if (recentCaseOpenings.length > 20) {
      setRecentCaseOpenings((prevOpenings: any) => {
        prevOpenings.pop();
        return prevOpenings;
      });
    }
  }, [recentCaseOpenings]);

  return (
    <div className="flex flex-col min-h-screen items-start justify-start bg-[#0e0e12] text-white relative isolate">
      <div className="amb" aria-hidden="true"><div className="amb-glow" />{Array.from({ length: 18 }).map((_, i) => (<span key={i} className="ember" style={{ left: `${(i * 5.5 + 3) % 100}%`, animationDuration: `${8 + (i % 6) * 2}s`, animationDelay: `${(i % 9) * 1.3}s` }} />))}</div>
      <UserContext.Provider
        value={{
          isLogged,
          toggleLogin,
          userData,
          toogleUserData,
          openUserFlow,
          toogleUserFlow
        }}
      >
        <Suspense fallback={
          <div />
        }>
          <GoogleOAuthProvider clientId={clientId}>
            <Router>
              <SkeletonTheme highlightColor="#14110c" baseColor="#221d16">
                <ScrollToTop />
                <LevelUpCelebration level={levelUp} onClose={closeLevelUp} />
                <ToastContainer
                  position="top-right"
                  autoClose={4000}
                  hideProgressBar={false}
                  closeOnClick={false}
                  pauseOnHover={true}
                  draggable={false}
                  theme="dark" />
                <Header
                  onlineUsers={onlineUsers}
                  recentCaseOpenings={recentCaseOpenings}
                  notification={notification}
                  setNotification={setNotification}
                />
                <div className="flex w-full">
                  <AppRoutes />
                </div>
                <div className="w-full pt-12">
                  <Footer />
                </div>
              </SkeletonTheme>
            </Router>
          </GoogleOAuthProvider>
        </Suspense>

      </UserContext.Provider>
    </div>
  );
}

export default App;

