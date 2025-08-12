'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Prediction {
  id: string;
  sport: string;
  title: string;
  description: string;
  odds: number;
  matchDate: string;
  creator: {
    email: string;
  };
}

const SPORTS_FILTERS = ['All', 'Football', 'Basketball', 'Tennis', 'Soccer', 'Baseball'];

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPredictions();
  }, [selectedSport, currentPage]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      if (selectedSport !== 'All') {
        params.append('sport', selectedSport);
      }

      const response = await api.get(`/predictions?${params.toString()}`);
      setPredictions(response.data.data.predictions);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sports Predictions</h1>
          <p className="text-gray-600">Browse our latest expert predictions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {SPORTS_FILTERS.map((sport) => (
            <button
              key={sport}
              onClick={() => {
                setSelectedSport(sport);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSport === sport
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Predictions */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : predictions.length > 0 ? (
          <div className="space-y-6">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-block px-3 py-1 text-sm font-semibold bg-primary-100 text-primary-800 rounded-full">
                        {prediction.sport}
                      </span>
                      <span className="text-sm text-gray-500">
                        by {prediction.creator.email}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {prediction.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4">{prediction.description}</p>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <span>Match Date: {format(new Date(prediction.matchDate), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  
                  <div className="text-right ml-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{prediction.odds}</p>
                      <p className="text-sm text-green-700">Odds</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No predictions found.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}