import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 bg-gradient-to-br from-card to-secondary border-border">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              To reset your password, please contact the owner on Discord:
            </p>
            
            <div className="bg-background/50 p-4 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Discord</span>
              </div>
              <code className="text-primary font-mono text-lg">1428273795407548487</code>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Send a direct message with your email address and the owner will help you reset your password.
            </p>
          </div>

          <Button 
            onClick={() => navigate('/auth')} 
            className="w-full"
            variant="outline"
          >
            Back to Sign In
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
