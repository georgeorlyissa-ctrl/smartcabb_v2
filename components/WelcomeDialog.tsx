import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Clock, Navigation } from '../lib/icons';

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  estimatedArrival: number;
}

export function WelcomeDialog({ isOpen, onClose, userName, estimatedArrival }: WelcomeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            👋 Bienvenue {userName}!
          </DialogTitle>
          <DialogDescription className="sr-only">
            Votre course est en cours de recherche. Vous recevrez une notification dès qu'un chauffeur accepte votre course.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-center pt-4">
          <div className="flex items-center justify-center space-x-2 text-lg">
            <Navigation className="w-5 h-5 text-secondary" />
            <span>Votre course est en cours de recherche</span>
          </div>
          
          {estimatedArrival > 0 && (
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Arrivée estimée: {estimatedArrival} min</span>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground px-4">
            Nous recherchons le meilleur chauffeur disponible pour vous. 
            Vous recevrez une notification dès qu'un chauffeur accepte votre course.
          </p>
        </div>
        
        <div className="mt-6">
          <Button 
            onClick={onClose} 
            className="w-full bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90"
          >
            Compris
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}