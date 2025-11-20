/**
 * User Profile Component
 * Displays user profile with dropdown showing access controls and account switching
 */
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { usePersona } from '../../contexts/PersonaContext';
import { PersonaTabService } from '../../services/PersonaTabService';
import { 
  getAllPersonaAccounts, 
  getCurrentAccount, 
  initializeAccounts, 
  setCurrentAccount as setAccountInStorage,
  PersonaAccount 
} from '../../services/PersonaAccountService';
import roleCapabilities from '../../config/roleCapabilities.json';

export interface UserProfileProps {
  userName?: string;
  userImage?: string;
}

export function UserProfile({ 
  userName = 'John Doe',
  userImage 
}: UserProfileProps) {
  const { role, persona, setRole, setPersona } = usePersona();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<PersonaAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<PersonaAccount | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize and load accounts
  useEffect(() => {
    initializeAccounts();
    const accounts = getAllPersonaAccounts();
    setAvailableAccounts(accounts);
    const current = getCurrentAccount();
    setCurrentAccount(current);
  }, []);

  // Update current account when role/persona changes
  useEffect(() => {
    const current = getCurrentAccount();
    setCurrentAccount(current);
  }, [role, persona]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Get current role capabilities for display
  const currentRoleCapabilities = (roleCapabilities as any).roleCapabilities[role] || {};
  
  // Format capability name for display
  const formatCapabilityName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleAccessClick = () => {
    setIsDropdownOpen(false);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  const handleAccountSwitch = (account: PersonaAccount) => {
    setAccountInStorage(account.role, account.persona);
    setRole(account.role);
    setPersona(account.persona);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <div className="user-profile-container" ref={dropdownRef}>
        <button 
          className="user-profile-button"
          onClick={toggleDropdown}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {userImage ? (
            <img 
              src={userImage} 
              alt={userName}
              className="user-profile-image"
            />
          ) : (
            <div className="user-profile-avatar">
              {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          )}
          <span className="user-profile-name">{userName}</span>
          <svg 
            className={`user-profile-arrow ${isDropdownOpen ? 'open' : ''}`}
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="user-profile-dropdown">
            <div className="user-profile-dropdown-section-header">
              <div className="user-profile-dropdown-current">
                <span className="user-profile-dropdown-current-label">Current Account</span>
                <span className="user-profile-dropdown-current-value">
                  {currentAccount?.displayName || `${role} - ${persona}`}
                </span>
              </div>
            </div>
            
            <div className="user-profile-dropdown-divider"></div>

            <div className="user-profile-dropdown-section">
              <div className="user-profile-dropdown-section-title">Switch Account</div>
              <div className="user-profile-dropdown-accounts">
                {availableAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`user-profile-dropdown-account-item ${
                      currentAccount?.id === account.id ? 'active' : ''
                    }`}
                    onClick={() => handleAccountSwitch(account)}
                  >
                    <div className="user-profile-dropdown-account-info">
                      <span className="user-profile-dropdown-account-role">{account.role}</span>
                      <span className="user-profile-dropdown-account-persona">{account.persona}</span>
                    </div>
                    {currentAccount?.id === account.id && (
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none"
                        className="user-profile-dropdown-account-check"
                      >
                        <path
                          d="M13 4L6 11L3 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="user-profile-dropdown-divider"></div>

            <div 
              className="user-profile-dropdown-item"
              onClick={handleAccessClick}
            >
              <span className="user-profile-dropdown-item-label">Access</span>
              <span className="user-profile-dropdown-item-value">{role}</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none"
                className="user-profile-dropdown-item-arrow"
              >
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {isPopupOpen && ReactDOM.createPortal(
        <div className="access-popup-backdrop" onClick={closePopup}>
          <div 
            className="access-popup-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="access-popup-header">
              <h3 className="access-popup-title">Access - {role}</h3>
              <button 
                className="access-popup-close"
                onClick={closePopup}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="access-popup-body">
              <div className="access-table-container">
                <table className="access-table">
                  <thead>
                    <tr>
                      {Object.entries(currentRoleCapabilities).map(([key]) => (
                        <th key={key} className="access-table-header">
                          {formatCapabilityName(key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Object.entries(currentRoleCapabilities).map(([key, value]) => (
                        <td key={key} className="access-table-cell">
                          <input
                            type="checkbox"
                            checked={value === true}
                            disabled
                            className="access-table-checkbox"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

