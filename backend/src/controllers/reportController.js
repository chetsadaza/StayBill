const Bill = require('../models/Bill');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');

// @desc    Get dashboard summary
// @route   GET /api/reports/summary
exports.getSummary = async (req, res, next) => {
  try {
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'available' });
    const occupiedRooms = await Room.countDocuments({ status: 'occupied' });
    const maintenanceRooms = await Room.countDocuments({ status: 'maintenance' });
    const activeTenants = await Tenant.countDocuments({ isActive: true });

    // Current month revenue
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthBills = await Bill.find({ billingMonth: currentMonth });
    const monthlyRevenue = currentMonthBills
      .filter(b => b.isPaid)
      .reduce((sum, b) => sum + b.totalAmount, 0);
    const pendingAmount = currentMonthBills
      .filter(b => !b.isPaid)
      .reduce((sum, b) => sum + b.totalAmount, 0);

    // Recent unpaid bills
    const unpaidBills = await Bill.find({ isPaid: false })
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        activeTenants,
        monthlyRevenue,
        pendingAmount,
        currentMonth,
        unpaidBills
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get revenue report
// @route   GET /api/reports/revenue
exports.getRevenueReport = async (req, res, next) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    // Get all bills for the year
    const bills = await Bill.find({
      billingMonth: { $regex: `^${targetYear}` }
    });

    // Group by month
    const monthlyData = {};
    for (let i = 1; i <= 12; i++) {
      const monthKey = `${targetYear}-${String(i).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: monthKey,
        totalRevenue: 0,
        rentRevenue: 0,
        waterRevenue: 0,
        electricityRevenue: 0,
        otherRevenue: 0,
        paidCount: 0,
        unpaidCount: 0,
        totalBills: 0
      };
    }

    bills.forEach(bill => {
      const data = monthlyData[bill.billingMonth];
      if (data) {
        data.totalBills++;
        if (bill.isPaid) {
          data.paidCount++;
          data.totalRevenue += bill.totalAmount;
          data.rentRevenue += bill.monthlyRent;
          data.waterRevenue += bill.waterTotal;
          data.electricityRevenue += bill.electricityTotal;
          const additionalTotal = (bill.additionalCharges || []).reduce((s, c) => s + c.amount, 0);
          data.otherRevenue += additionalTotal;
        } else {
          data.unpaidCount++;
        }
      }
    });

    const report = Object.values(monthlyData);
    const totalYear = report.reduce((sum, m) => sum + m.totalRevenue, 0);

    res.json({
      success: true,
      data: {
        year: Number(targetYear),
        totalYearRevenue: totalYear,
        monthly: report
      }
    });
  } catch (error) {
    next(error);
  }
};
