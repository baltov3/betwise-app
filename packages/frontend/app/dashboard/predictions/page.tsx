'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Prediction {
  id: string;
  categoryId: string;
  title: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  pick: string;
  odds: string;
  scheduledAt: string;
  status: string;
  resultNote?: string;
  category?: Category;
  creator: {
    email: string;
  };
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('UPCOMING');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [selectedCategory, selectedStatus, currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/predictions/categories/list');
      setCategories(response.data.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '10',
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (selectedStatus) {
        params.append('status', selectedStatus);
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      UPCOMING: 'bg-blue-100 text-blue-800',
      WON: 'bg-green-100 text-green-800',
      LOST: 'bg-red-100 text-red-800',
      VOID: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => {
                    setSelectedCategory(category.slug);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.slug
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {['UPCOMING', 'WON', 'LOST'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setSelectedStatus(status);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
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
                        {prediction.category?.name}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(prediction.status)}`}>
                        {prediction.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        by {prediction.creator.email}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {prediction.title}
                    </h3>
                    
                    {prediction.league && (
                      <p className="text-sm text-gray-500 mb-1">{prediction.league}</p>
                    )}
                    
                    {(prediction.homeTeam || prediction.awayTeam) && (
                      <p className="text-sm text-gray-600 mb-2">
                        {prediction.homeTeam} vs {prediction.awayTeam}
                      </p>
                    )}
                    
                    <p className="text-gray-700 mb-2">
                      <span className="font-semibold">Pick:</span> {prediction.pick}
                    </p>
                    
                    {prediction.resultNote && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Result:</span> {prediction.resultNote}
                      </p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <span>Scheduled: {format(new Date(prediction.scheduledAt), 'MMM dd, yyyy HH:mm')}</span>
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