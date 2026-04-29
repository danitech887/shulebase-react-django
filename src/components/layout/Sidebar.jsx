import React, { useMemo, useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '/assets/images/logo.png';
import { AuthContext } from '../../context/AuthContext';
import {
  HouseFill,
  PeopleFill,
  PersonBadge,
  CashStack,
  PencilSquare,
  PlusCircleFill,
  Check2Circle,
  GraphUp,
  CheckCircleFill,
  BookHalf,
  PersonBoundingBox,
  MegaphoneFill,
  ChatHeartFill,
  FileEarmarkSpreadsheet,
} from 'react-bootstrap-icons';
import './Sidebar.css';

export default function Sidebar({ collapsed = false, mobileOpen = false, onToggle, onBackdropClick, onClose }) {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase();

  const [open, setOpen] = useState({
    students:   true,
    teachers:   true,
    attendance: false,
    academics:  true,
    resources:  true,
  });

  /* ── Nav groups by role ── */
  const groups = useMemo(() => {
    const dashboardItem = {
      id: 'root',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: <HouseFill /> },
        { to: '/announcements', label: 'Announcements', icon: <MegaphoneFill /> },
        { to: '/reviews', label: 'Reviews', icon: <ChatHeartFill /> }
      ],
    };

    if (role === 'admin') {
      return [
        dashboardItem,
        {
          id: 'students',
          label: 'Students',
          icon: <PeopleFill />,
          items: [
            { to: '/students/register',   label: 'Register Student',  icon: <PlusCircleFill /> },
            { to: '/students/fees',       label: 'Fee Management',     icon: <CashStack /> },
            { to: '/students/leave',      label: 'Leave Management',   icon: <CheckCircleFill /> },
            { to: '/students/academics',  label: 'Academics',          icon: <GraphUp /> },
            { to: '/students/attendance', label: 'Student Attendance', icon: <Check2Circle /> },
          ],
        },
        {
          id: 'teachers',
          label: 'Teachers',
          icon: <PersonBadge />,
          items: [
            { to: '/teachers/dashboard',  label: 'Dashboard',       icon: <HouseFill /> },
            { to: '/teachers/details',    label: 'Manage Details',  icon: <PencilSquare /> },
            { to: '/teachers/attendance', label: 'Attendance',      icon: <Check2Circle /> },
            { to: '/teachers/roles',      label: 'Role Management', icon: <GraphUp /> },
            { to: '/teachers/leave',      label: 'Leave Management',icon: <CheckCircleFill /> },
            { to: '/teachers/progress',   label: 'Teaching Progress',icon: <BookHalf /> },
          ],
        },
        {
          id: 'school',
          label: 'School',
          icon: <PersonBadge />,
          items: [
            { to: '/school/account',  label: 'Account',       icon: <PersonBoundingBox /> },

          ],
        },
      ];
    }

    if (role === 'teacher') {
      return [
        dashboardItem,
        {
          id: 'academics',
          label: 'Academics',
          icon: <BookHalf />,
          items: [
            { to: '/teachers-portal/strands',          label: 'CBC Strands',       icon: <PlusCircleFill /> },
            { to: '/teachers-portal/teachingprogress', label: 'Teaching Progress', icon: <GraphUp /> },
            { to: '/teachers-portal/competencies',     label: 'Competencies',      icon: <BookHalf /> },
          ],
        },
        {
          id: 'attendance',
          label: 'Attendance',
          icon: <Check2Circle />,
          items: [
            { to: '/teachers-portal/attendance', label: 'Mark Attendance', icon: <CheckCircleFill /> },
          ],
        },
        {
          id: 'resources',
          label: 'Resources',
          icon: <PersonBoundingBox />,
          items: [
            { to: '/teachers-portal/resources',        label: 'Learning Resources', icon: <HouseFill /> },
            { to: '/teachers-portal/account',          label: 'My Account',         icon: <PencilSquare /> },
            { to: '/teachers-portal/leave-management', label: 'Leave Application',  icon: <CheckCircleFill /> },
          ],
        },
      ];
    }

    if (role === 'student') {
      return [
        dashboardItem,
        {
          id: 'student-portal',
          label: 'Student Portal',
          icon: <PersonBoundingBox />,
          items: [
            { to: '/students-portal/dashboard',  label: 'Dashboard',        icon: <HouseFill /> },
            { to: '/students-portal/fees',       label: 'Fee Status',        icon: <CashStack /> },
            { to: '/students-portal/attendance', label: 'Attendance Record', icon: <Check2Circle /> },
            { to: '/students-portal/academics',  label: 'Academic Progress', icon: <GraphUp /> },
          ],
        },
      ];
    }

    if (role === 'parent') {
      return [
        dashboardItem,
        {
          id: 'parent-portal',
          label: 'Parent Portal',
          icon: <PersonBoundingBox />,
          items: [
            { to: '/parent-portal/dashboard',  label: 'Dashboard',        icon: <HouseFill /> },
            { to: '/parent-portal/fees',       label: 'Fee Status',        icon: <CashStack /> },
            { to: '/parent-portal/leave',      label: 'Leave Management',  icon: <CheckCircleFill /> },
            { to: '/parent-portal/attendance', label: 'Attendance Record', icon: <Check2Circle /> },
            { to: '/parent-portal/academics',  label: 'Academic Progress', icon: <GraphUp /> },
          ],
        },
      ];
    }

    return [dashboardItem];
  }, [role]);

  const toggle = (id) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  const closeSidebar = () => {
    if (onClose) onClose();
    else if (onToggle) onToggle();
  };

  const asideClass = [
    'sb-aside',
    collapsed  ? 'collapsed'   : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sb-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={asideClass}>

        {/* ── Logo area ── */}
        <div className="sb-logo-area">
          {(!collapsed || mobileOpen) && (
            <div className="sb-logo-wrap">
              <img src={logo} alt="School Logo" width={90} height={60} />
            </div>
          )}

          {/* Desktop collapse/expand toggle */}
          <button
            type="button"
            className="sb-toggle-btn sb-toggle-desktop"
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '»' : '«'}
          </button>

          {/* Mobile close button — absolute positioning for reliability */}
          <button
            type="button"
            className="sb-toggle-btn sb-close-mobile"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">
          {groups.map((group) => {
            const isRoot = group.id === 'root';
            const isOpen = isRoot || !!open[group.id];

            return (
              <div key={group.id} className="sb-group">
                {!isRoot && (
                  <button
                    type="button"
                    className="sb-group-btn"
                    onClick={() => toggle(group.id)}
                    aria-expanded={isOpen}
                    title={collapsed ? group.label : undefined}
                  >
                    <span className="sb-group-left">
                      <span className="sb-group-icon">{group.icon}</span>
                      {!collapsed && (
                        <span className="sb-group-label">{group.label}</span>
                      )}
                    </span>
                    {!collapsed && (
                      <span className={`sb-group-chevron${isOpen ? ' open' : ''}`}>▼</span>
                    )}
                  </button>
                )}

                {isOpen && (
                  <div className={`sb-items${isRoot ? ' sb-root-items' : ''}`}>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        data-label={item.label}
                        className={({ isActive }) =>
                          `sb-nav-item${isActive ? ' active' : ''}`
                        }
                        onClick={() => {
                          if (mobileOpen) closeSidebar();
                        }}
                      >
                        <span className="sb-item-icon">{item.icon}</span>
                        {!collapsed && (
                          <span className="sb-item-label">{item.label}</span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="sb-footer">
          <span className="sb-version">{collapsed ? 'v1' : 'v1.0.0'}</span>
        </div>
      </aside>
    </>
  );
}