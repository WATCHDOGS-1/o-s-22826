import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">OnlyFocus</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The ultimate online study room platform with video cameras and screen sharing. 
              Study together with accountability partners in virtual coworking spaces designed for productivity and focus.
            </p>
          </div>

          {/* Features Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Virtual Study Rooms with Video</li>
              <li>• Screen Share for Collaboration</li>
              <li>• Pomodoro Timer & Focus Tracking</li>
              <li>• Study Streak Accountability</li>
              <li>• Online Coworking Spaces</li>
              <li>• Real-time Progress Stats</li>
            </ul>
          </div>

          {/* Keywords & Links Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Study Better</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Join thousands using OnlyFocus for online study sessions, virtual coworking, 
              and productive focus time with webcam accountability.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-500">
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">study online</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">coworking</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">focus room</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">productivity</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">screen share</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">study with cameras</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2025 OnlyFocus. Online study rooms, virtual coworking spaces, and focus productivity tools.
          </p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <Link to="/" className="hover:text-primary">Home</Link>
            <Link to="/leaderboard" className="hover:text-primary">Leaderboard</Link>
            <Link to="/auth" className="hover:text-primary">Sign In</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
