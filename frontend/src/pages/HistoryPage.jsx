import { useNavigate } from 'react-router-dom';
import './HistoryPage.css';

const conversations = [
  {
    id: 1,
    title: 'Balcony Structural Integrity',
    desc: 'Discussion about the structural integrity of the cantilevered glass balcony in the South wing, focusing on load-bearing capacities and thermal bridge prevention.',
    date: 'Today',
    time: '10:45 AM',
    messages: 8,
    icon: 'foundation',
  },
  {
    id: 2,
    title: 'Atrium Natural Light Optimization',
    desc: 'Simulating solar paths for the main lobby atrium. Analyzing different glazing options to maximize daylight while minimizing heat gain in summer months.',
    date: 'Today',
    time: '09:20 AM',
    messages: 12,
    icon: 'wb_sunny',
  },
  {
    id: 3,
    title: 'Foundation Material Specifications',
    desc: 'Finalizing the concrete mix specifications for the deep pile foundation. Reviewing moisture barriers and soil report compatibility.',
    date: 'Yesterday',
    time: '03:15 PM',
    messages: 6,
    icon: 'layers',
  },
  {
    id: 4,
    title: 'BIM Coordination Workflow',
    desc: 'Setting up the automated clash detection rules for the MEP and Structural models. Discussion on IFC export parameters.',
    date: 'Yesterday',
    time: '11:02 AM',
    messages: 15,
    icon: 'hub',
  },
  {
    id: 5,
    title: 'Sustainable Facade Materials',
    desc: 'Evaluating bio-based facade materials including cross-laminated timber panels and recycled aluminum cladding for LEED certification.',
    date: 'Oct 24, 2023',
    time: '02:30 PM',
    messages: 9,
    icon: 'eco',
  },
  {
    id: 6,
    title: 'HVAC System Design Review',
    desc: 'Comprehensive review of the underfloor air distribution system for the open-plan office floors. Energy modeling results and ductwork specifications.',
    date: 'Oct 22, 2023',
    time: '04:45 PM',
    messages: 11,
    icon: 'air',
  },
];

export default function HistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="history-page" id="history-page">
      {/* Header */}
      <header className="history-header">
        <div className="history-header-content">
          <h1 className="headline-md">Conversation History</h1>
          <p className="body-md history-header-desc">
            Review and continue your past architectural consultations.
          </p>
        </div>
        <div className="history-header-actions">
          <div className="history-search-box">
            <span className="material-icons-outlined">search</span>
            <input
              type="text"
              placeholder="Search conversations..."
              className="history-search-input"
              id="history-search"
            />
          </div>
        </div>
      </header>

      {/* List */}
      <div className="history-list" id="history-list">
        {conversations.map((conv, index) => (
          <div
            key={conv.id}
            className="history-card animate-fade-in"
            style={{ animationDelay: `${index * 0.06}s` }}
            onClick={() => navigate('/chat')}
            id={`history-card-${conv.id}`}
          >
            <div className="history-card-icon">
              <span className="material-icons-outlined">{conv.icon}</span>
            </div>
            <div className="history-card-body">
              <div className="history-card-top">
                <h3 className="title-sm history-card-title">{conv.title}</h3>
                <span className="history-card-date label-sm">{conv.date} • {conv.time}</span>
              </div>
              <p className="body-md history-card-desc">{conv.desc}</p>
              <div className="history-card-footer">
                <span className="history-card-badge">
                  <span className="material-icons-outlined">chat_bubble_outline</span>
                  {conv.messages} messages
                </span>
              </div>
            </div>
            <button className="history-card-action" aria-label="More options">
              <span className="material-icons-outlined">more_vert</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
