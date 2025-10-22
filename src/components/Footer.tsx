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
              The premier online study room and virtual coworking platform featuring live video cameras, screen sharing, and real-time productivity tracking. 
              Join thousands studying together with webcam accountability in our focus-driven coworking spaces. Perfect for remote studying, 
              virtual study groups, online homework sessions, and building consistent study habits with pomodoro timers and streak tracking.
            </p>
          </div>

          {/* Features Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Live Webcam Study Rooms - Video Accountability</li>
              <li>• Screen Share Study Sessions - Real-time Collaboration</li>
              <li>• Pomodoro Focus Timer with Progress Tracking</li>
              <li>• Daily Study Streaks & Habit Building</li>
              <li>• Virtual Coworking Spaces - Study Online Together</li>
              <li>• Real-time Study Stats & Leaderboard Competition</li>
              <li>• Remote Study Groups - Global Study Community</li>
              <li>• Focus Mode - Distraction-free Study Environment</li>
            </ul>
          </div>

          {/* Keywords & Links Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Study Better Online</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Join the leading online study room community for virtual coworking with webcam accountability. 
              Perfect for students, remote workers, and anyone seeking a productive study environment with real people studying together online.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-500">
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">online study room</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">virtual coworking</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">study with camera</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">focus timer</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">pomodoro online</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">screen share study</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">remote study group</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">study accountability</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">webcam study</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">virtual study space</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">online homework</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">study streak</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2025 OnlyFocus. The best online study room with live cameras, virtual coworking spaces, screen sharing for remote studying, 
            pomodoro focus timers, study streak tracking, and webcam accountability for productive study sessions with global students.
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
