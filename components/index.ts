// ============================================
// COMPOSANTS UI GÉNÉRAUX
// ============================================
export { PhoneInput } from './PhoneInput';
export { default as PhoneInputDefault } from './PhoneInput';
export { EmailPhoneInput } from './EmailPhoneInput';

// ============================================
// CARTES ET GÉOLOCALISATION
// ============================================
export { MapView } from './MapView'; // 🆕 Wrapper intelligent Google Maps + OpenStreetMap
export { GoogleMapView } from './GoogleMapView';
export { OpenStreetMapView, KinshasaMapView } from './OpenStreetMapView';
export { InteractiveMapView } from './InteractiveMapView'; // @deprecated - utilisez MapView

// ============================================
// COMPOSANTS PARTAGÉS UTILES
// ============================================
export { LoadingScreen } from './LoadingScreen';
export { ErrorBoundary } from './ErrorBoundary';
export { PageTransition } from './PageTransition';
export { BackendSyncProvider } from './BackendSyncProvider';
export { ExchangeRateSync } from './ExchangeRateSync';
export { PWAInstallPrompt, OnlineStatusIndicator } from './PWAInstallPrompt';

// ============================================
// NAVIGATION ET ROUTING
// ============================================
export { AppRouter } from './AppRouter';

// ============================================
// AUTRES COMPOSANTS MÉTIER
// ============================================
export { SmartCabbLogo } from './SmartCabbLogo';
export { RouteMapPreview } from './RouteMapPreview';
export { AddressSearchInput } from './AddressSearchInput';
export { CurrencySelector } from './CurrencySelector';
export { PassengerCountSelector } from './PassengerCountSelector';
export { PromoCodeInput } from './PromoCodeInput';
export { TipSelector } from './TipSelector';
export { MixedPaymentSelector } from './MixedPaymentSelector';
export { RideTimer } from './RideTimer';
export { ChatWidget } from './ChatWidget';
export { EmergencyAlert } from './EmergencyAlert';
export { VehicleImageCarousel } from './VehicleImageCarousel';