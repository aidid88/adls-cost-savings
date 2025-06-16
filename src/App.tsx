import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const ADLSCostSavingsViz = () => {
  const [dataSize, setDataSize] = useState(300); // TB
  const [coolTransitionYears, setCoolTransitionYears] = useState(0.5);
  const [coldTransitionYears, setColdTransitionYears] = useState(2);
  const [archiveTransitionYears, setArchiveTransitionYears] = useState(7);
  const [redundancyType, setRedundancyType] = useState('LRS');
  
  // ADLS Gen2 pricing (approximate USD per GB per month) - US West 2 region
  const basePricing = {
    hot: 0.0184, // Hot tier LRS
    cool: 0.01, // Cool tier LRS
    cold: 0.0045, // Cold tier LRS
    archive: 0.00099 // Archive tier LRS
  };
  
  // Redundancy multipliers
  const redundancyMultipliers = {
    LRS: 1.0, // Locally Redundant Storage (baseline)
    ZRS: 1.25, // Zone Redundant Storage (~25% more)
    GRS: 2.0, // Geo Redundant Storage (~100% more)
    'RA-GRS': 2.5, // Read Access Geo Redundant Storage (~150% more)
    GZRS: 2.5, // Geo Zone Redundant Storage (~150% more)
    'RA-GZRS': 3.1 // Read Access Geo Zone Redundant Storage (~210% more)
  };
  
  // Calculate pricing based on redundancy type
  const pricing = {
    hot: basePricing.hot * redundancyMultipliers[redundancyType],
    cool: basePricing.cool * redundancyMultipliers[redundancyType],
    cold: basePricing.cold * redundancyMultipliers[redundancyType],
    archive: basePricing.archive * redundancyMultipliers[redundancyType]
  };
  
  // Access costs (per GB)
  const accessCosts = {
    hot: 0,
    cool: 0.01,
    cold: 0.02,
    archive: 0.10
  };

  const generateCostData = useMemo(() => {
    const years = 10;
    const dataGb = dataSize * 1024; // Convert TB to GB
    const monthlyData = [];
    
    for (let month = 0; month <= years * 12; month++) {
      const yearFloat = month / 12;
      let tier, storageCost;
      
      if (yearFloat < coolTransitionYears) {
        tier = 'Hot';
        storageCost = dataGb * pricing.hot;
      } else if (yearFloat < coldTransitionYears) {
        tier = 'Cool';
        storageCost = dataGb * pricing.cool;
      } else if (yearFloat < archiveTransitionYears) {
        tier = 'Cold';
        storageCost = dataGb * pricing.cold;
      } else {
        tier = 'Archive';
        storageCost = dataGb * pricing.archive;
      }
      
      // Calculate costs without lifecycle policy (always hot)
      const hotOnlyCost = dataGb * pricing.hot;
      
      monthlyData.push({
        month,
        year: yearFloat,
        tier,
        withLifecycle: storageCost,
        hotOnly: hotOnlyCost,
        savings: hotOnlyCost - storageCost,
        cumulativeSavings: monthlyData.length > 0 ? 
          monthlyData[monthlyData.length - 1].cumulativeSavings + (hotOnlyCost - storageCost) : 
          (hotOnlyCost - storageCost)
      });
    }
    
    return monthlyData;
  }, [dataSize, coldTransitionYears, archiveTransitionYears]);

  const yearlyData = useMemo(() => {
    const yearly = [];
    for (let year = 1; year <= 10; year++) {
      const monthIndex = year * 12 - 1;
      if (monthIndex < generateCostData.length) {
        const data = generateCostData[monthIndex];
        yearly.push({
          year,
          withLifecycle: data.withLifecycle * 12,
          hotOnly: data.hotOnly * 12,
          savings: data.savings * 12,
          cumulativeSavings: data.cumulativeSavings
        });
      }
    }
    return yearly;
  }, [generateCostData]);

  const totalSavings10Years = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].cumulativeSavings : 0;
  const savingsPercentage = totalSavings10Years / (dataSize * 1024 * pricing.hot * 12 * 10) * 100;

  const tierDistribution = [
    { name: `Hot (0-${coolTransitionYears} years)`, value: coolTransitionYears, color: '#ff6b6b' },
    { name: `Cool (${coolTransitionYears}-${coldTransitionYears} years)`, value: coldTransitionYears - coolTransitionYears, color: '#ffa500' },
    { name: `Cold (${coldTransitionYears}-${archiveTransitionYears} years)`, value: archiveTransitionYears - coldTransitionYears, color: '#4ecdc4' },
    { name: `Archive (${archiveTransitionYears}+ years)`, value: 10 - archiveTransitionYears, color: '#45b7d1' }
  ];

  const COLORS = ['#ff6b6b', '#ffa500', '#4ecdc4', '#45b7d1'];

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ADLS Cost Savings with Lifecycle Management
        </h1>
        <p className="text-gray-600 mb-6">
          Analyze potential cost savings by implementing automated tier transitions for your Azure Data Lake Storage.<br/>
          <span className="text-sm text-gray-500">Current pricing based on {redundancyType} redundancy in US West 2 region</span>
        </p>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Size (TB)
            </label>
            <input
              type="number"
              value={dataSize}
              onChange={(e) => setDataSize(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="10000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Redundancy Type
            </label>
            <select
              value={redundancyType}
              onChange={(e) => setRedundancyType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LRS">LRS (Locally Redundant)</option>
              <option value="ZRS">ZRS (Zone Redundant)</option>
              <option value="GRS">GRS (Geo Redundant)</option>
              <option value="RA-GRS">RA-GRS (Read Access Geo)</option>
              <option value="GZRS">GZRS (Geo Zone Redundant)</option>
              <option value="RA-GZRS">RA-GZRS (Read Access Geo Zone)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Move to Cool After (Years)
            </label>
            <input
              type="number"
              value={coolTransitionYears}
              onChange={(e) => setCoolTransitionYears(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0.1"
              max="5"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Move to Cold After (Years)
            </label>
            <input
              type="number"
              value={coldTransitionYears}
              onChange={(e) => setColdTransitionYears(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={coolTransitionYears + 0.1}
              max="10"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Move to Archive After (Years)
            </label>
            <input
              type="number"
              value={archiveTransitionYears}
              onChange={(e) => setArchiveTransitionYears(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={coldTransitionYears + 0.1}
              max="15"
              step="0.1"
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-400 to-green-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">10-Year Savings</h3>
            <p className="text-2xl font-bold">${totalSavings10Years.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-400 to-blue-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Savings %</h3>
            <p className="text-2xl font-bold">{savingsPercentage.toFixed(1)}%</p>
          </div>
          <div className="bg-gradient-to-r from-red-400 to-red-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Monthly (Hot)</h3>
            <p className="text-2xl font-bold">${(dataSize * 1024 * pricing.hot).toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Monthly (Cool)</h3>
            <p className="text-2xl font-bold">${(dataSize * 1024 * pricing.cool).toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 text-white p-4 rounded-lg">
            <h3 className="text-sm font-medium opacity-90">Monthly (Archive)</h3>
            <p className="text-2xl font-bold">${(dataSize * 1024 * pricing.archive).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cumulative Savings Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Cumulative Cost Savings Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
              <Line 
                type="monotone" 
                dataKey="cumulativeSavings" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Annual Cost Comparison */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Annual Cost Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
              <Bar dataKey="hotOnly" fill="#ef4444" name="Hot Tier Only" />
              <Bar dataKey="withLifecycle" fill="#3b82f6" name="With Lifecycle Policy" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Lifecycle Distribution (10 Years)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tierDistribution.filter(tier => tier.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value} years`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {tierDistribution.filter(tier => tier.value > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Tier Timeline */}
          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2">Tier Transition Timeline:</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-1"></div>
                <span>Hot (0-{coolTransitionYears}y)</span>
              </div>
              <span>→</span>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-500 rounded mr-1"></div>
                <span>Cool ({coolTransitionYears}-{coldTransitionYears}y)</span>
              </div>
              <span>→</span>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-teal-500 rounded mr-1"></div>
                <span>Cold ({coldTransitionYears}-{archiveTransitionYears}y)</span>
              </div>
              <span>→</span>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-1"></div>
                <span>Archive ({archiveTransitionYears}y+)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pricing Breakdown ({redundancyType})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Tier</th>
                  <th className="text-right py-2">$/GB/Month</th>
                  <th className="text-right py-2">Monthly Cost ({dataSize}TB)</th>
                  <th className="text-right py-2">vs LRS</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium text-red-600">Hot</td>
                  <td className="text-right py-2">${pricing.hot.toFixed(4)}</td>
                  <td className="text-right py-2">${(dataSize * 1024 * pricing.hot).toLocaleString()}</td>
                  <td className="text-right py-2 text-sm text-gray-500">
                    {redundancyType === 'LRS' ? 'Baseline' : `+${((redundancyMultipliers[redundancyType] - 1) * 100).toFixed(0)}%`}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-orange-600">Cool</td>
                  <td className="text-right py-2">${pricing.cool.toFixed(4)}</td>
                  <td className="text-right py-2">${(dataSize * 1024 * pricing.cool).toLocaleString()}</td>
                  <td className="text-right py-2 text-sm text-gray-500">
                    {redundancyType === 'LRS' ? 'Baseline' : `+${((redundancyMultipliers[redundancyType] - 1) * 100).toFixed(0)}%`}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-teal-600">Cold</td>
                  <td className="text-right py-2">${pricing.cold.toFixed(4)}</td>
                  <td className="text-right py-2">${(dataSize * 1024 * pricing.cold).toLocaleString()}</td>
                  <td className="text-right py-2 text-sm text-gray-500">
                    {redundancyType === 'LRS' ? 'Baseline' : `+${((redundancyMultipliers[redundancyType] - 1) * 100).toFixed(0)}%`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-indigo-600">Archive</td>
                  <td className="text-right py-2">${pricing.archive.toFixed(6)}</td>
                  <td className="text-right py-2">${(dataSize * 1024 * pricing.archive).toLocaleString()}</td>
                  <td className="text-right py-2 text-sm text-gray-500">
                    {redundancyType === 'LRS' ? 'Baseline' : `+${((redundancyMultipliers[redundancyType] - 1) * 100).toFixed(0)}%`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Redundancy Options Explained:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div><strong>LRS:</strong> 3 copies within single datacenter (99.999999999% durability)</div>
              <div><strong>ZRS:</strong> 3 copies across availability zones (99.9999999999% durability)</div>
              <div><strong>GRS:</strong> LRS + async copy to paired region (99.99999999999999% durability)</div>
              <div><strong>RA-GRS:</strong> GRS + read access to secondary region</div>
              <div><strong>GZRS:</strong> ZRS + async copy to paired region</div>
              <div><strong>RA-GZRS:</strong> GZRS + read access to secondary region</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Prices are approximate for US West 2 region and may vary. 
              Consider additional costs for data retrieval, transactions, and data transfer.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Cost Optimization Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">4-Tier Lifecycle Benefits:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Granular cost optimization with 4 storage tiers</li>
              <li>• Early transition to Cool tier for immediate savings</li>
              <li>• Progressive cost reduction: Hot → Cool → Cold → Archive</li>
              <li>• Up to {((pricing.hot - pricing.archive) / pricing.hot * 100).toFixed(0)}% savings per GB in archive tier</li>
              <li>• Balanced performance and cost trade-offs</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Tier Characteristics & Considerations:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Cool:</strong> Lower cost, ~1h retrieval, 30-day minimum</li>
              <li>• <strong>Cold:</strong> Further savings, ~12h retrieval, 90-day minimum</li>
              <li>• <strong>Archive:</strong> Lowest cost, up to 15h retrieval, 180-day minimum</li>
              <li>• Consider access patterns and retrieval SLAs</li>
              <li>• Early deletion fees apply for minimum duration requirements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ADLSCostSavingsViz;