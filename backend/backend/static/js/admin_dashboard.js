/**
 * ShuleBase Admin Dashboard Enhancements
 * Dynamically injects analytics cards and charts into the Django Admin Index
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only run on the admin index page
    if (window.location.pathname === '/admin/' || window.location.pathname === '/admin') {
        injectAnalytics();
    }
});

async function injectAnalytics() {
    try {
        const response = await fetch('/api/dashboard/');
        if (!response.ok) return;
        const data = await response.json();

        // Create the analytics container
        const container = document.createElement('div');
        container.className = 'row mb-4 admin-analytics-row';
        container.style.marginTop = '20px';

        const stats = [
            { 
                title: 'Students', 
                value: data.students, 
                icon: '🎓', 
                color: 'primary',
                extra: `M: ${data.gender_distribution?.Male || 0} | F: ${data.gender_distribution?.Female || 0}`
            },
            { 
                title: 'Teachers', 
                value: data.teachers, 
                icon: '👨‍🏫', 
                color: 'success',
                extra: `Today: ${data.present_teachers || 0} Present`
            },
            { 
                title: 'Fees Collected', 
                value: 'Ksh ' + (data.fee_paid || 0).toLocaleString(), 
                icon: '💰', 
                color: 'warning',
                extra: `Target: ${data.fee_collection_rate || 0}%`
            },
            { 
                title: 'Attendance', 
                value: (data.attendance_percentage || 0) + '%', 
                icon: '📊', 
                color: 'info',
                extra: `Leave: ${data.leave_count || 0}`
            }
        ];

        container.innerHTML = stats.map(stat => `
            <div class="col-lg-3 col-6">
                <div class="small-box bg-${stat.color}">
                    <div class="inner">
                        <h3>${stat.value}</h3>
                        <p style="margin-bottom: 0;">${stat.title}</p>
                        <small style="opacity: 0.8; font-weight: 500;">${stat.extra}</small>
                    </div>
                    <div class="icon">
                        <span>${stat.icon}</span>
                    </div>
                    <a href="#" class="small-box-footer">View Details <i class="fas fa-arrow-circle-right"></i></a>
                </div>
            </div>
        `).join('');

        // Find where to inject
        const contentHeader = document.querySelector('.content-header');
        if (contentHeader) {
            // Trial Counter Banner
            if (data.pricing && !data.pricing.is_paid) {
                const trialAlert = document.createElement('div');
                trialAlert.className = 'col-12 mb-4';
                const days = data.pricing.remaining_trial_days;
                const color = days <= 2 ? 'danger' : 'info';
                trialAlert.innerHTML = `
                    <div class="alert alert-${color} d-flex align-items-center justify-content-between shadow-sm" 
                         style="border-radius: 12px; border: none; background: ${color === 'danger' ? 'linear-gradient(135deg, #ff4b2b, #ff416c)' : 'linear-gradient(135deg, #2193b0, #6dd5ed)'}; color: white;">
                        <div class="d-flex align-items-center">
                            <span style="font-size: 1.5rem; margin-right: 15px;">⏳</span>
                            <div>
                                <h5 class="mb-0" style="font-weight: 700;">${days} Days Remaining in Free Trial</h5>
                                <p class="mb-0" style="opacity: 0.9;">Your school is currently on the <strong>${data.pricing.plan_name} Plan</strong>. Please complete payment to avoid service interruption.</p>
                            </div>
                        </div>
                        <a href="/admin/core/pricing/" class="btn btn-light btn-sm px-4" style="font-weight: 700; border-radius: 8px; color: ${color === 'danger' ? '#ff416c' : '#2193b0'};">Upgrade & Pay</a>
                    </div>
                `;
                container.prepend(trialAlert);
            }
            contentHeader.after(container);
        }
    } catch (error) {
        console.error('Failed to load admin analytics', error);
    }
}
