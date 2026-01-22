import { useState } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'
import jsPDF from 'jspdf'

const Reports = () => {
  const { reports, addReport, deleteReport } = useData()
  const [uploadedImages, setUploadedImages] = useState([])
  const [reportTitle, setReportTitle] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)


  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            id: Date.now() + Math.random(),
            url: e.target.result,
            name: file.name
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(imagePromises).then(images => {
      setUploadedImages(prev => [...prev, ...images])
    })
  }

  // Remove image
  const removeImage = (id) => {
    setUploadedImages(uploadedImages.filter(img => img.id !== id))
  }

  // Generate PDF Report
  const generatePDF = () => {
    if (!reportTitle || uploadedImages.length === 0) {
      alert('Please add a title and at least one image')
      return
    }

    setIsGenerating(true)

    setTimeout(() => {
      const doc = new jsPDF()
      
      // Header
      doc.setFillColor(255, 193, 7)
      doc.rect(0, 0, 210, 35, 'F')
      
      doc.setTextColor(31, 31, 31)
      doc.setFontSize(22)
      doc.setFont(undefined, 'bold')
      doc.text(reportTitle, 105, 15, { align: 'center' })
      
      if (reportDescription) {
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        doc.text(reportDescription, 105, 25, { align: 'center', maxWidth: 170 })
      }
      
      // Date
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(9)
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 45)
      
      // Add images
      let yPos = 55
      uploadedImages.forEach((image, index) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        
        // Add image
        const imgWidth = 170
        const imgHeight = 100
        doc.addImage(image.url, 'JPEG', 20, yPos, imgWidth, imgHeight)
        
        // Image caption
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Image ${index + 1}`, 20, yPos + imgHeight + 5)
        
        yPos += imgHeight + 15
      })
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `Campaign Hub - Page ${i} of ${pageCount}`,
          105,
          290,
          { align: 'center' }
        )
      }
      
      // Save as blob URL
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      const pdfName = `${reportTitle.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`
      
      // Save report
      const newReport = {
        title: reportTitle,
        description: reportDescription,
        imageCount: uploadedImages.length,
        pdfUrl: pdfUrl,
        pdfName: pdfName,
        blob: pdfBlob // Store blob for direct download
      }
      
      addReport(newReport)
      
      // Auto-download the generated PDF
      try {
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = pdfName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('Auto-download error:', error)
      }
      
      // Reset form
      setReportTitle('')
      setReportDescription('')
      setUploadedImages([])
      setIsGenerating(false)
      
      alert('Report generated successfully!')
    }, 500)
  }

  // Download PDF
  const downloadPDF = (report) => {
    try {
      const link = document.createElement('a')
      link.href = report.pdfUrl
      link.download = report.pdfName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      // Fallback: open in new tab
      window.open(report.pdfUrl, '_blank')
    }
  }

  return (
    <PageLoader delay={350}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Report Maker</h1>
          <p className="text-sm text-gray-600">Create PDF reports with photos</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Create Report Section */}
          <div className="col-span-1 bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Report</h2>
          
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Report title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Brief description..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Upload Images *
                </label>
                <div className="flex justify-center px-4 py-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-yellow-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-xs text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500">
                        <span>Upload</span>
                        <input type="file" multiple accept="image/*" className="sr-only" onChange={handleImageUpload} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Images Preview */}
              {uploadedImages.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Images ({uploadedImages.length})
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img src={image.url} alt={image.name} className="w-full h-20 object-cover rounded" />
                        <button onClick={() => removeImage(image.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={generatePDF}
                disabled={isGenerating || !reportTitle || uploadedImages.length === 0}
                className="w-full px-4 py-2 bg-[#FFC107] text-gray-900 text-sm font-semibold rounded-lg hover:bg-[#FFB300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Generate PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Reports */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Reports</h2>
          
            {reports.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-3 hover:border-[#FFC107] transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{report.title}</h3>
                        {report.description && (
                          <p className="text-xs text-gray-600 line-clamp-1">{report.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="text-gray-400 hover:text-red-500 ml-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>📸 {report.imageCount} images</span>
                      <span>{report.createdAt}</span>
                    </div>
                    
                    <button
                      onClick={() => downloadPDF(report)}
                      className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No reports yet</h3>
                <p className="text-xs text-gray-600">Create your first report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLoader>
  )
}

export default Reports
