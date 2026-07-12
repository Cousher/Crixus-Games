import { useState, useLayoutEffect } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import CasePage from "./pages/CasePage/CasePage";
import Marketplace from "./pages/Market/Marketplace";
import CoinFlip from "./pages/Coin/CoinFlip";
import CrashGame from "./pages/Crash/Crash";
import Upgrade from "./pages/Upgrade/Upgrade";
import Slot from "./pages/Slot/Slot";
import PrivacyPolicy from "./pages/About/PrivacyPolicy"
import ItemPage from "./pages/Market/ItemPage";
import Mines from "./pages/Mines/Mines";
import Rewards from "./pages/Rewards/Rewards";

const defaultRoutes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/profile/:id" element={<Profile />} />
    <Route path="/case/:id" element={<CasePage />} />
    <Route path="/marketplace" element={<Marketplace />} />
    <Route path="/marketplace/item/:itemId" element={<ItemPage/>} />
    <Route path="/coinflip" element={<CoinFlip />} />
    <Route path="/crash" element={<CrashGame />} />
    <Route path="/upgrade" element={<Upgrade />} />
    <Route path="/slot" element={<Slot />} />
    <Route path="/mines" element={<Mines />} />
    <Route path="/rewards" element={<Rewards />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
  </>
);

const AppRoutes = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);

  useLayoutEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      if ((document as any).startViewTransition) {
        (document as any).startViewTransition(() => {
          setDisplayLocation(location);
        });
      } else {
        setDisplayLocation(location);
      }
    } else {
      setDisplayLocation(location);
    }
  }, [location, displayLocation]);

  return (
    <Routes location={displayLocation}>
      {defaultRoutes}
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
