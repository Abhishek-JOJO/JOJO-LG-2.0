//
//  UIImageView+Extension.swift
//  JOJO App
//
//  Created by Abhishek Bakhai on 24/04/25.
//

import UIKit
import AVFoundation
import QuartzCore
import ImageIO
import Accelerate
import Kingfisher

// MARK: - Associated Object Keys

private var currentImageURLKey: UInt8 = 0
private var failedImageURLKey: UInt8 = 0
private var currentImageRequestIdentifierKey: UInt8 = 0

enum JOJOImageFit: String {
    case cover
    case contain
    case fill
    case inside
    case outside

    static func resolved(for contentMode: UIImageView.ContentMode) -> JOJOImageFit {
        switch contentMode {
        case .scaleAspectFit:
            return .contain
        case .scaleToFill:
            return .fill
        default:
            return .cover
        }
    }
}

enum JOJOImageRequestConfiguration {
    static var quality: Int = 80
    static var format: String = "webp"
    static var maximumPixelDimension: CGFloat = 1600
    static var minimumTargetDimension: CGFloat = 40
    static var fallbackTargetSize: CGSize {
        return CGSize(width: 600, height: 338)
    }

    static func sanitizedQuality(_ value: Int) -> Int {
        return min(max(value, 1), 100)
    }

    static func sanitizedTargetSize(_ value: CGSize) -> CGSize {
        let width = max(0, value.width)
        let height = max(0, value.height)

        guard width >= minimumTargetDimension,
              height >= minimumTargetDimension
        else {
            return fallbackTargetSize
        }

        let maxSide = max(width, height)

        guard maxSide > maximumPixelDimension else {
            return CGSize(width: width, height: height)
        }

        let scale = maximumPixelDimension / maxSide
        return CGSize(
            width: max(1, width * scale),
            height: max(1, height * scale)
        )
    }

    static func shouldRetryOriginal(after error: KingfisherError) -> Bool {
        let description = "\(error) \(error.localizedDescription)".lowercased()
        let nonRetryableMarkers = [
            "taskcancelled",
            "task cancelled",
            "task canceled",
            "cancelled",
            "canceled",
            "notcurrentsourcetask",
            "not current source task"
        ]

        return !nonRetryableMarkers.contains { marker in
            description.contains(marker)
        }
    }
}

extension URL {
    func jojoResizedImageURL(
        targetSize: CGSize,
        fit: JOJOImageFit = .cover,
        quality: Int = JOJOImageRequestConfiguration.quality,
        format: String = JOJOImageRequestConfiguration.format
    ) -> URL {
        guard let scheme = scheme?.lowercased(),
              scheme == "http" || scheme == "https"
        else {
            return self
        }

        let requestSize = JOJOImageRequestConfiguration.sanitizedTargetSize(
            targetSize
        )
        let width = Int(ceil(requestSize.width))
        let height = Int(ceil(requestSize.height))
        let quality = JOJOImageRequestConfiguration.sanitizedQuality(quality)

        guard var components = URLComponents(url: self, resolvingAgainstBaseURL: false) else {
            return self
        }

        let reservedKeys: Set<String> = ["width", "height", "fit", "quality", "format"]
        var queryItems = components.queryItems?
            .filter { !reservedKeys.contains($0.name.lowercased()) } ?? []

        queryItems.append(URLQueryItem(name: "width", value: "\(width)"))
        queryItems.append(URLQueryItem(name: "height", value: "\(height)"))
        queryItems.append(URLQueryItem(name: "fit", value: fit.rawValue))
        queryItems.append(URLQueryItem(name: "quality", value: "\(quality)"))
        queryItems.append(URLQueryItem(name: "format", value: format))

        components.queryItems = queryItems
        return components.url ?? self
    }
}

#if DEBUG
enum JOJOImageRequestDebugCounter {
    private static var originalRequestCount = 0
    private static var optimizedRequestCount = 0
    private static var fallbackOriginalRequestCount = 0
    private static var originalRequestURLs = Set<String>()
    private static var optimizedRequestURLs = Set<String>()
    private static var fallbackOriginalRequestURLs = Set<String>()

    static func record(
        originalURL: URL?,
        requestURL: URL?,
        source: String,
        targetSize: CGSize? = nil,
        fit: JOJOImageFit? = nil,
        quality: Int? = nil,
        isFallbackOriginal: Bool = false,
        reason: String? = nil,
        note: String? = nil
    ) {
        guard let requestURL else { return }

        let isOptimized = isOptimizedRequest(
            requestURL,
            originalURL: originalURL
        )

        if isFallbackOriginal {
            fallbackOriginalRequestCount += 1
            fallbackOriginalRequestURLs.insert(requestURL.absoluteString)
        } else if isOptimized {
            optimizedRequestCount += 1
            optimizedRequestURLs.insert(requestURL.absoluteString)
        } else {
            originalRequestCount += 1
            originalRequestURLs.insert(requestURL.absoluteString)
        }

        let requestType: String
        if isFallbackOriginal {
            requestType = "fallbackOriginal"
        } else {
            requestType = isOptimized ? "optimized" : "original"
        }

        print(
            "[JOJOImageDebug] type=\(requestType) source=\(source) " +
            "counts(original=\(originalRequestCount), " +
            "optimized=\(optimizedRequestCount), " +
            "fallbackOriginal=\(fallbackOriginalRequestCount)) " +
            "unique(original=\(originalRequestURLs.count), " +
            "optimized=\(optimizedRequestURLs.count), " +
            "fallbackOriginal=\(fallbackOriginalRequestURLs.count)) " +
            "asset=\(assetKind(for: requestURL)) " +
            "\(resizeDescription(for: requestURL, fallbackSize: targetSize, fit: fit, quality: quality)) " +
            "\(note.map { "note=\($0) " } ?? "")" +
            "\(normalizedReason(reason).map { "reason=\($0) " } ?? "")" +
            "url=\(requestURL.absoluteString)"
        )
    }

    private static func isOptimizedRequest(
        _ requestURL: URL,
        originalURL: URL?
    ) -> Bool {
        guard requestURL != originalURL,
              let components = URLComponents(
                url: requestURL,
                resolvingAgainstBaseURL: false
              ),
              let queryItems = components.queryItems
        else {
            return false
        }

        let names = Set(queryItems.map { $0.name.lowercased() })
        return names.contains("width")
            && names.contains("height")
            && names.contains("fit")
            && names.contains("quality")
            && names.contains("format")
    }

    private static func assetKind(for url: URL) -> String {
        let path = url.path.lowercased()

        if path.contains("/titleimages/") {
            return "title"
        }

        if path.contains("/posterimages/") {
            return "poster"
        }

        if path.contains("/landscapeimages/") {
            return "landscape"
        }

        if path.contains("/avatars/") {
            return "avatar"
        }

        return "unknown"
    }

    private static func normalizedReason(_ reason: String?) -> String? {
        guard let reason else { return nil }

        let value = reason
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !value.isEmpty else { return nil }

        if value.count > 160 {
            return "\(value.prefix(160))..."
        }

        return value
    }

    private static func resizeDescription(
        for url: URL,
        fallbackSize: CGSize?,
        fit: JOJOImageFit?,
        quality: Int?
    ) -> String {
        let params = resizeParams(from: url)

        if let width = params["width"],
           let height = params["height"] {
            return "width=\(width) height=\(height) fit=\(params["fit"] ?? "-") quality=\(params["quality"] ?? "-") format=\(params["format"] ?? "-")"
        }

        if let fallbackSize {
            return "width=original height=original target=\(Int(fallbackSize.width))x\(Int(fallbackSize.height)) fit=\(fit?.rawValue ?? "-") quality=\(quality.map(String.init) ?? "-") format=-"
        }

        return "width=original height=original fit=\(fit?.rawValue ?? "-") quality=\(quality.map(String.init) ?? "-") format=-"
    }

    private static func resizeParams(from url: URL) -> [String: String] {
        guard let components = URLComponents(
            url: url,
            resolvingAgainstBaseURL: false
        ),
              let queryItems = components.queryItems
        else {
            return [:]
        }

        return queryItems.reduce(into: [:]) { result, item in
            result[item.name.lowercased()] = item.value
        }
    }
}
#endif

// MARK: - UIImageView Extension

extension UIImageView {

    private var fallbackLabelTag: Int {
        return 999999
    }

    private var activityIndicatorTag: Int {
        return 999998
    }

    private func imageRequestIdentifier(
        cacheKey: String?,
        fallbackText: String?
    ) -> String {
        return "\(cacheKey ?? "nil")|\(fallbackText ?? "")"
    }

    private func setCurrentImageRequestIdentifier(_ identifier: String?) {
        objc_setAssociatedObject(
            self,
            &currentImageRequestIdentifierKey,
            identifier,
            .OBJC_ASSOCIATION_COPY_NONATOMIC
        )
    }

    private func isCurrentImageRequest(_ identifier: String) -> Bool {
        return objc_getAssociatedObject(
            self,
            &currentImageRequestIdentifierKey
        ) as? String == identifier
    }

    // MARK: - Kingfisher Image Loading

    func setImage(
        with resource: Resource?,
        placeholder: UIImage? = nil,
        resizingImageProcessor: ResizingImageProcessor? = nil,
        contentMode: UIImageView.ContentMode = .scaleAspectFill,
        fallbackText: String? = nil,
        renderAsTemplate: Bool = false,
        cornerRadius: CGFloat = 0,
        showActivityIndicator: Bool = true,
        fit: JOJOImageFit? = nil,
        quality: Int = JOJOImageRequestConfiguration.quality,
        optimizeRequestURL: Bool = true,
        completionBlock: ((Bool, UIImage?, String?) -> Void)? = nil
    ) {
        let originalResource = resource
        let targetSize = tvOSDownsampleTargetSize()
        let resolvedFit = fit ?? JOJOImageFit.resolved(for: contentMode)
        let imageResource = optimizeRequestURL ? optimizedImageResource(
            from: resource,
            targetSize: targetSize,
            fit: resolvedFit,
            quality: quality
        ) : resource
        let requestIdentifier = imageRequestIdentifier(
            cacheKey: imageResource?.cacheKey,
            fallbackText: fallbackText
        )

        // Avoid restarting the same visible request during tvOS focus/layout
        // churn. Repeated configure calls can otherwise cancel and requeue the
        // same poster/title image many times while the user is moving focus.
        if let imageResource,
           let currentURL = objc_getAssociatedObject(
                self,
                &currentImageURLKey
           ) as? String,
           currentURL == imageResource.cacheKey {

            self.contentMode = contentMode

            if self.image != nil {
                self.removeFallbackLabel()
                completionBlock?(true, self.image, nil)
                return
            }

            if let failedURL = objc_getAssociatedObject(
                self,
                &failedImageURLKey
            ) as? String,
               failedURL == imageResource.cacheKey {

                self.kf.indicatorType = .none
                self.contentMode = .scaleAspectFit

                if let fallbackText {
                    self.showFallbackLabel(text: fallbackText)
                }

                completionBlock?(false, nil, nil)
                return
            }

            if self.kf.taskIdentifier != nil {
                return
            }
        }

        // Cancel any previous Kingfisher request after the same-URL fast path.
        self.kf.cancelDownloadTask()

        // Remove previous fallback label.
        self.removeFallbackLabel()
        self.removeActivityIndicatorView()

        // Stop any previous GIF animation.
        self.stopAnimating()
        self.animationImages = nil
        self.setCurrentImageRequestIdentifier(requestIdentifier)
        self.image = placeholder

        // Store the currently requested image URL.
        if let imageResource {

            objc_setAssociatedObject(
                self,
                &currentImageURLKey,
                imageResource.cacheKey,
                .OBJC_ASSOCIATION_COPY_NONATOMIC
            )

            if let failedURL = objc_getAssociatedObject(
                self,
                &failedImageURLKey
            ) as? String,
               failedURL != imageResource.cacheKey {

                objc_setAssociatedObject(
                    self,
                    &failedImageURLKey,
                    nil,
                    .OBJC_ASSOCIATION_COPY_NONATOMIC
                )
            }

        } else {

            objc_setAssociatedObject(
                self,
                &currentImageURLKey,
                nil,
                .OBJC_ASSOCIATION_COPY_NONATOMIC
            )

            objc_setAssociatedObject(
                self,
                &failedImageURLKey,
                nil,
                .OBJC_ASSOCIATION_COPY_NONATOMIC
            )
        }

        guard imageResource != nil else {
            self.kf.indicatorType = .none
            self.contentMode = .scaleAspectFit

            if let fallbackText {
                self.showFallbackLabel(text: fallbackText)
            }

            completionBlock?(false, nil, nil)
            return
        }

        self.kf.indicatorType = .none
        if showActivityIndicator {
            self.showActivityIndicatorView()
        }

        // Resolve an appropriate target size for downsampling.
        //
        // This prevents Kingfisher from keeping large 3000x2000+ images
        // in memory when the actual UIImageView is much smaller.
        var processor: ImageProcessor =
            DownsamplingImageProcessor(size: targetSize)

        if let resizingImageProcessor {
            processor = processor |> resizingImageProcessor
        }

        if cornerRadius > 0 {
            processor = processor |> RoundCornerImageProcessor(
                cornerRadius: cornerRadius
            )
        }

        let options: KingfisherOptionsInfo = [
            .processor(processor),
            .scaleFactor(UIScreen.main.scale),
            .transition(.fade(0.2)),
            .backgroundDecode,
            .cacheOriginalImage
        ]

#if DEBUG
        JOJOImageRequestDebugCounter.record(
            originalURL: originalResource?.downloadURL,
            requestURL: imageResource?.downloadURL,
            source: "UIImageView.setImage",
            targetSize: targetSize,
            fit: resolvedFit,
            quality: quality,
            note: optimizeRequestURL ? nil : "resizeDisabled"
        )
#endif

        self.kf.setImage(
            with: imageResource,
            placeholder: placeholder,
            options: options,
            progressBlock: nil
        ) { [weak self] result in

            guard let self else {
                return
            }

            guard self.isCurrentImageRequest(requestIdentifier) else {
                return
            }

            self.kf.indicatorType = .none
            self.removeActivityIndicatorView()

            switch result {

            case .success(let value):

                objc_setAssociatedObject(
                    self,
                    &failedImageURLKey,
                    nil,
                    .OBJC_ASSOCIATION_COPY_NONATOMIC
                )

                self.contentMode = contentMode

                if renderAsTemplate {
                    self.image = value.image.withRenderingMode(
                        .alwaysTemplate
                    )
                } else {
                    self.image = value.image
                }

                self.removeFallbackLabel()

                completionBlock?(
                    true,
                    value.image,
                    nil
                )

            case .failure(let error):

                if self.shouldRetryOriginalImageResource(
                    originalResource,
                    after: imageResource,
                    error: error
                ) {
                    self.retryOriginalImageResource(
                        originalResource,
                        attemptedResource: imageResource,
                        placeholder: placeholder,
                        options: options,
                        contentMode: contentMode,
                        fallbackText: fallbackText,
                        renderAsTemplate: renderAsTemplate,
                        failureReason: error.localizedDescription,
                        requestIdentifier: requestIdentifier,
                        completionBlock: completionBlock
                    )
                    return
                }

                self.showImageFailure(
                    for: imageResource,
                    fallbackText: fallbackText,
                    errorDescription: error.localizedDescription,
                    completionBlock: completionBlock
                )
            }
        }
    }

    // MARK: - tvOS Downsampling

    private func shouldRetryOriginalImageResource(
        _ originalResource: Resource?,
        after attemptedResource: Resource?,
        error: KingfisherError
    ) -> Bool {
        guard let originalResource,
              let attemptedResource,
              JOJOImageRequestConfiguration.shouldRetryOriginal(after: error)
        else {
            return false
        }

        return originalResource.cacheKey != attemptedResource.cacheKey
            || originalResource.downloadURL != attemptedResource.downloadURL
    }

    private func retryOriginalImageResource(
        _ originalResource: Resource?,
        attemptedResource: Resource?,
        placeholder: UIImage?,
        options: KingfisherOptionsInfo,
        contentMode: UIImageView.ContentMode,
        fallbackText: String?,
        renderAsTemplate: Bool,
        failureReason: String?,
        requestIdentifier: String,
        completionBlock: ((Bool, UIImage?, String?) -> Void)?
    ) {
        guard isCurrentImageRequest(requestIdentifier) else {
            return
        }

        guard let originalResource else {
            showImageFailure(
                for: attemptedResource,
                fallbackText: fallbackText,
                errorDescription: nil,
                completionBlock: completionBlock
            )
            return
        }

        if let attemptedResource,
           let currentURL = objc_getAssociatedObject(
                self,
                &currentImageURLKey
           ) as? String,
           currentURL != attemptedResource.cacheKey {
            return
        }

#if DEBUG
        JOJOImageRequestDebugCounter.record(
            originalURL: originalResource.downloadURL,
            requestURL: originalResource.downloadURL,
            source: "UIImageView.setImage.retryOriginal",
            isFallbackOriginal: true,
            reason: failureReason
        )
#endif

        self.kf.setImage(
            with: originalResource,
            placeholder: placeholder,
            options: options,
            progressBlock: nil
        ) { [weak self] result in

            guard let self else {
                return
            }

            guard self.isCurrentImageRequest(requestIdentifier) else {
                return
            }

            self.kf.indicatorType = .none
            self.removeActivityIndicatorView()

            if let attemptedResource,
               let currentURL = objc_getAssociatedObject(
                    self,
                    &currentImageURLKey
               ) as? String,
               currentURL != attemptedResource.cacheKey {
                return
            }

            switch result {

            case .success(let value):

                objc_setAssociatedObject(
                    self,
                    &failedImageURLKey,
                    nil,
                    .OBJC_ASSOCIATION_COPY_NONATOMIC
                )

                self.contentMode = contentMode

                if renderAsTemplate {
                    self.image = value.image.withRenderingMode(
                        .alwaysTemplate
                    )
                } else {
                    self.image = value.image
                }

                self.removeFallbackLabel()

                completionBlock?(
                    true,
                    value.image,
                    nil
                )

            case .failure(let error):

                self.showImageFailure(
                    for: attemptedResource ?? originalResource,
                    fallbackText: fallbackText,
                    errorDescription: error.localizedDescription,
                    completionBlock: completionBlock
                )
            }
        }
    }

    private func showImageFailure(
        for resource: Resource?,
        fallbackText: String?,
        errorDescription: String?,
        completionBlock: ((Bool, UIImage?, String?) -> Void)?
    ) {
        if let resource {
            objc_setAssociatedObject(
                self,
                &failedImageURLKey,
                resource.cacheKey,
                .OBJC_ASSOCIATION_COPY_NONATOMIC
            )
        }

        self.kf.indicatorType = .none
        self.removeActivityIndicatorView()
        self.image = nil
        self.contentMode = .scaleAspectFit

        if let fallbackText {
            self.showFallbackLabel(text: fallbackText)
        }

        completionBlock?(
            false,
            nil,
            errorDescription
        )
    }

    private func optimizedImageResource(
        from resource: Resource?,
        targetSize: CGSize,
        fit: JOJOImageFit,
        quality: Int
    ) -> Resource? {
        guard let resource else { return nil }

        let downloadURL = resource.downloadURL
        let resizedURL = downloadURL.jojoResizedImageURL(
            targetSize: targetSize,
            fit: fit,
            quality: quality
        )

        guard resizedURL != downloadURL else { return resource }

        return resizedURL
    }

    /// Returns an appropriate target size for image downsampling.
    ///
    /// This keeps images close to their actual on-screen size instead of
    /// decoding and retaining full-resolution source images.
    private func tvOSDownsampleTargetSize() -> CGSize {

        superview?.layoutIfNeeded()
        layoutIfNeeded()

        let width = bounds.width
        let height = bounds.height

        if width > 0, height > 0 {

            // Add a small buffer for tvOS focus/parallax scaling.
            return JOJOImageRequestConfiguration.sanitizedTargetSize(CGSize(
                width: width * 1.15,
                height: height * 1.15
            ))
        }

        return JOJOImageRequestConfiguration.fallbackTargetSize
    }

    // MARK: - Fallback Label

    private func showFallbackLabel(text: String) {

        removeFallbackLabel()

        let label = UILabel()

        label.text = text
        label.textColor = .white
        label.font = Typography.bodyXsRegular.font
        label.textAlignment = .center
        label.numberOfLines = 2
        label.tag = fallbackLabelTag
        label.translatesAutoresizingMaskIntoConstraints = false

        addSubview(label)

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(
                equalTo: centerXAnchor
            ),

            label.centerYAnchor.constraint(
                equalTo: centerYAnchor
            ),

            label.leadingAnchor.constraint(
                greaterThanOrEqualTo: leadingAnchor,
                constant: 8
            ),

            label.trailingAnchor.constraint(
                lessThanOrEqualTo: trailingAnchor,
                constant: -8
            )
        ])
    }

    private func removeFallbackLabel() {

        viewWithTag(fallbackLabelTag)?
            .removeFromSuperview()
    }

    // MARK: - GIF From URL

    func setImageFromGIF(
        url: URL,
        placeholder: UIImage? = nil,
        options: KingfisherOptionsInfo? = nil,
        progressBlock: DownloadProgressBlock? = nil,
        playOnlyOnce: Bool = false,
        completionHandler: (
            (Result<RetrieveImageResult, KingfisherError>
            ) -> Void
        )? = nil
    ) {

        self.stopAnimating()
        self.animationImages = nil

        self.kf.indicatorType = .none
        self.showActivityIndicatorView()

        self.kf.setImage(
            with: url,
            placeholder: placeholder,
            options: options,
            progressBlock: progressBlock
        ) { [weak self] result in

            guard let self else {
                return
            }

            switch result {

            case .success(let value):

                // Check whether the downloaded image is a GIF.
                if value.source.url?.pathExtension.lowercased() == "gif" {

                    self.kf.indicatorType = .none
                    self.removeActivityIndicatorView()

                    guard let gifData = value.image.kf.gifRepresentation(),
                          let source = CGImageSourceCreateWithData(
                            gifData as CFData,
                            nil
                          ) else {

                        completionHandler?(result)
                        return
                    }

                    let frameCount = CGImageSourceGetCount(source)

                    var frames: [UIImage] = []
                    frames.reserveCapacity(frameCount)

                    var gifDuration: TimeInterval = 0

                    for index in 0..<frameCount {

                        guard let cgImage =
                            CGImageSourceCreateImageAtIndex(
                                source,
                                index,
                                nil
                            ) else {
                            continue
                        }

                        let properties =
                            CGImageSourceCopyPropertiesAtIndex(
                                source,
                                index,
                                nil
                            ) as? [String: Any]

                        let gifProperties =
                            properties?[
                                kCGImagePropertyGIFDictionary as String
                            ] as? [String: Any]

                        let frameDuration =
                            gifProperties?[
                                kCGImagePropertyGIFDelayTime as String
                            ] as? TimeInterval ?? 0.1

                        gifDuration += frameDuration

                        let frame = UIImage(cgImage: cgImage)

                        frames.append(frame)
                    }

                    self.animationImages = frames
                    self.animationDuration = gifDuration

                    if playOnlyOnce {

                        self.animationRepeatCount = 1
                        self.startAnimating()

                        DispatchQueue.main.asyncAfter(
                            deadline: .now() + gifDuration
                        ) { [weak self] in

                            self?.stopAnimating()
                            self?.animationImages = nil
                        }

                    } else {

                        self.animationRepeatCount = 0
                        self.startAnimating()
                    }

                } else {

                    self.kf.indicatorType = .none
                    self.removeActivityIndicatorView()
                    self.image = value.image
                }

                completionHandler?(result)

            case .failure(let error):

                self.kf.indicatorType = .none
                self.removeActivityIndicatorView()
                self.stopAnimating()
                self.animationImages = nil

                completionHandler?(
                    .failure(error)
                )
            }
        }
    }

    // MARK: - Local GIF

    func loadLocalGIF(
        named gifName: String,
        playOnlyOnce: Bool = false
    ) {

        guard
            let gifPath = Bundle.main.path(
                forResource: gifName,
                ofType: "gif"
            ),
            let gifData = NSData(
                contentsOfFile: gifPath
            )
        else {

            print(
                "Failed to load GIF: \(gifName).gif"
            )

            return
        }

        DispatchQueue.global(qos: .userInitiated).async {

            guard let source = CGImageSourceCreateWithData(
                gifData as CFData,
                nil
            ) else {

                print(
                    "Failed to create CGImageSource"
                )

                return
            }

            let frameCount = CGImageSourceGetCount(source)

            var frames: [UIImage] = []
            frames.reserveCapacity(frameCount)

            var totalDuration: TimeInterval = 0

            for index in 0..<frameCount {

                guard let cgImage =
                    CGImageSourceCreateImageAtIndex(
                        source,
                        index,
                        nil
                    ) else {
                    continue
                }

                let properties =
                    CGImageSourceCopyPropertiesAtIndex(
                        source,
                        index,
                        nil
                    ) as? [String: Any]

                let gifProperties =
                    properties?[
                        kCGImagePropertyGIFDictionary as String
                    ] as? [String: Any]

                let frameDuration =
                    gifProperties?[
                        kCGImagePropertyGIFDelayTime as String
                    ] as? TimeInterval ?? 0.1

                totalDuration += frameDuration

                frames.append(
                    UIImage(cgImage: cgImage)
                )
            }

            DispatchQueue.main.async { [weak self] in

                guard let self else {
                    return
                }

                self.stopAnimating()

                self.animationImages = frames
                self.animationDuration = totalDuration
                self.animationRepeatCount =
                    playOnlyOnce ? 1 : 0

                self.startAnimating()

                if playOnlyOnce {

                    DispatchQueue.main.asyncAfter(
                        deadline: .now() + totalDuration
                    ) { [weak self] in

                        self?.stopAnimating()
                        self?.animationImages = nil
                    }
                }
            }
        }
    }

    // MARK: - Load GIF With URL

    func loadGIF(url: URL) {

        DispatchQueue.global(qos: .background).async { [weak self] in

            guard let self else {
                return
            }

            guard let gifData = try? Data(
                contentsOf: url
            ) else {
                return
            }

            guard let source = CGImageSourceCreateWithData(
                gifData as CFData,
                nil
            ) else {
                return
            }

            let frameCount = CGImageSourceGetCount(source)

            var images: [UIImage] = []
            images.reserveCapacity(frameCount)

            var duration: TimeInterval = 0

            for index in 0..<frameCount {

                guard let cgImage =
                    CGImageSourceCreateImageAtIndex(
                        source,
                        index,
                        nil
                    ) else {
                    continue
                }

                let frameProperties =
                    CGImageSourceCopyPropertiesAtIndex(
                        source,
                        index,
                        nil
                    ) as? [CFString: Any]

                let gifProperties =
                    frameProperties?[
                        kCGImagePropertyGIFDictionary
                    ] as? [CFString: Any]

                let frameDuration =
                    gifProperties?[
                        kCGImagePropertyGIFUnclampedDelayTime
                    ] as? Double
                    ?? gifProperties?[
                        kCGImagePropertyGIFDelayTime
                    ] as? Double
                    ?? 0.1

                duration += frameDuration

                images.append(
                    UIImage(cgImage: cgImage)
                )
            }

            DispatchQueue.main.async { [weak self] in

                guard let self else {
                    return
                }

                self.stopAnimating()

                self.animationImages = images
                self.animationDuration = duration
                self.animationRepeatCount = 0

                self.startAnimating()
            }
        }
    }

    // MARK: - Local GIF From File Name

    func setImageFromLocalGIF(
        fileName: String,
        playOnlyOnce: Bool = false
    ) {

        guard
            let filePath = Bundle.main.path(
                forResource: fileName,
                ofType: "gif"
            ),
            let gifData = NSData(
                contentsOfFile: filePath
            )
        else {

            AppLogger.logInfo(
                "GIF file not found: \(fileName).gif"
            )

            return
        }

        guard let source = CGImageSourceCreateWithData(
            gifData as CFData,
            nil
        ) else {

            AppLogger.logInfo(
                "Failed to create CGImageSource from GIF data"
            )

            return
        }

        let frameCount = CGImageSourceGetCount(source)

        var frames: [UIImage] = []
        frames.reserveCapacity(frameCount)

        var gifDuration: TimeInterval = 0

        for index in 0..<frameCount {

            guard let cgImage =
                CGImageSourceCreateImageAtIndex(
                    source,
                    index,
                    nil
                ) else {
                continue
            }

            let properties =
                CGImageSourceCopyPropertiesAtIndex(
                    source,
                    index,
                    nil
                ) as? [String: Any]

            let gifProperties =
                properties?[
                    kCGImagePropertyGIFDictionary as String
                ] as? [String: Any]

            let frameDuration =
                gifProperties?[
                    kCGImagePropertyGIFDelayTime as String
                ] as? TimeInterval ?? 0.1

            gifDuration += frameDuration

            frames.append(
                UIImage(cgImage: cgImage)
            )
        }

        self.stopAnimating()

        self.animationImages = frames
        self.animationDuration = gifDuration

        if playOnlyOnce {

            self.animationRepeatCount = 1
            self.startAnimating()

            DispatchQueue.main.asyncAfter(
                deadline: .now() + gifDuration
            ) { [weak self] in

                self?.stopAnimating()
                self?.animationImages = nil
            }

        } else {

            self.animationRepeatCount = 0
            self.startAnimating()
        }
    }

    // MARK: - Image With Activity Indicator

    func setImageWithActivity(
        url: URL?,
        placeholder: UIImage? = UIImage(
            named: "ic_profile_placeholder"
        ),
        cornerRadius: CGFloat = 0,
        contentMode: UIView.ContentMode = .scaleAspectFill,
        renderAsTemplate: Bool = false,
        fallbackText: String? = nil,
        fit: JOJOImageFit? = nil,
        quality: Int = JOJOImageRequestConfiguration.quality,
        optimizeRequestURL: Bool = true,
        completion: ((Bool, UIImage?) -> Void)? = nil
    ) {

        self.contentMode = contentMode

        self.image = placeholder

        // Remove previous fallback labels.
        self.subviews
            .filter {
                $0.tag == fallbackLabelTag
            }
            .forEach {
                $0.removeFromSuperview()
            }

        self.removeActivityIndicatorView()

        let targetSize = tvOSDownsampleTargetSize()
        let requestURL = optimizeRequestURL ? url?.jojoResizedImageURL(
            targetSize: targetSize,
            fit: fit ?? JOJOImageFit.resolved(for: contentMode),
            quality: quality
        ) : url
        let requestIdentifier = imageRequestIdentifier(
            cacheKey: requestURL?.absoluteString,
            fallbackText: fallbackText
        )
        setCurrentImageRequestIdentifier(requestIdentifier)

        if requestURL != nil {
            showActivityIndicatorView()
        }

        guard requestURL != nil else {
            applyActivityImageFailure(
                placeholder: placeholder,
                fallbackText: fallbackText,
                completion: completion
            )
            return
        }

        // Setup image processor.
        var processor: ImageProcessor =
            DownsamplingImageProcessor(
                size: targetSize
            )

        if cornerRadius > 0 {

            processor = processor
                |> RoundCornerImageProcessor(
                    cornerRadius: cornerRadius
                )
        }

        let options: KingfisherOptionsInfo = [
            .processor(processor),
            .scaleFactor(UIScreen.main.scale),
            .transition(.fade(0.2)),
            .backgroundDecode
        ]

#if DEBUG
        JOJOImageRequestDebugCounter.record(
            originalURL: url,
            requestURL: requestURL,
            source: "UIImageView.setImageWithActivity",
            targetSize: targetSize,
            fit: fit ?? JOJOImageFit.resolved(for: contentMode),
            quality: quality,
            note: optimizeRequestURL ? nil : "resizeDisabled"
        )
#endif

        self.kf.setImage(
            with: requestURL,
            placeholder: placeholder,
            options: options
        ) { [weak self] result in

            guard let self else {
                return
            }

            guard self.isCurrentImageRequest(requestIdentifier) else {
                return
            }

            // Remove activity indicator.
            self.removeActivityIndicatorView()

            switch result {

            case .success(let value):

                self.applyActivityImageSuccess(
                    value,
                    renderAsTemplate: renderAsTemplate,
                    completion: completion
                )

            case .failure(let error):

                if let url,
                   let requestURL,
                   requestURL != url,
                   JOJOImageRequestConfiguration.shouldRetryOriginal(
                        after: error
                   ) {

#if DEBUG
                    JOJOImageRequestDebugCounter.record(
                        originalURL: url,
                        requestURL: url,
                        source: "UIImageView.setImageWithActivity.retryOriginal",
                        isFallbackOriginal: true,
                        reason: error.localizedDescription
                    )
#endif

                    self.kf.setImage(
                        with: url,
                        placeholder: placeholder,
                        options: options
                    ) { [weak self] retryResult in

                        guard let self else {
                            return
                        }

                        guard self.isCurrentImageRequest(requestIdentifier) else {
                            return
                        }

                        self.removeActivityIndicatorView()

                        switch retryResult {

                        case .success(let value):

                            self.applyActivityImageSuccess(
                                value,
                                renderAsTemplate: renderAsTemplate,
                                completion: completion
                            )

                        case .failure:

                            self.applyActivityImageFailure(
                                placeholder: placeholder,
                                fallbackText: fallbackText,
                                completion: completion
                            )
                        }
                    }

                    return
                }

                self.applyActivityImageFailure(
                    placeholder: placeholder,
                    fallbackText: fallbackText,
                    completion: completion
                )
            }
        }
    }

    private func showActivityIndicatorView(size: CGFloat = 56) {
        removeActivityIndicatorView()

        let activity = JOJOLoaderView(style: .medium)
        activity.tag = activityIndicatorTag
        activity.translatesAutoresizingMaskIntoConstraints = false

        addSubview(activity)

        NSLayoutConstraint.activate([
            activity.centerXAnchor.constraint(equalTo: centerXAnchor),
            activity.centerYAnchor.constraint(equalTo: centerYAnchor),
            activity.widthAnchor.constraint(equalToConstant: size),
            activity.heightAnchor.constraint(equalToConstant: size)
        ])

        activity.startAnimating()
    }

    private func removeActivityIndicatorView() {
        subviews
            .filter {
                $0.tag == activityIndicatorTag
            }
            .forEach {
                $0.removeFromSuperview()
            }
    }

    private func applyActivityImageSuccess(
        _ value: RetrieveImageResult,
        renderAsTemplate: Bool,
        completion: ((Bool, UIImage?) -> Void)?
    ) {
        removeFallbackLabel()

        var image = value.image

        if renderAsTemplate {
            image = image.withRenderingMode(
                .alwaysTemplate
            )

            tintColor = .white
        }

        self.image = image

        completion?(
            true,
            image
        )
    }

    private func applyActivityImageFailure(
        placeholder: UIImage?,
        fallbackText: String?,
        completion: ((Bool, UIImage?) -> Void)?
    ) {
        removeActivityIndicatorView()
        image = placeholder

        if let fallbackText {
            removeFallbackLabel()

            let label = UILabel()

            label.tag = fallbackLabelTag
            label.text = fallbackText
            label.numberOfLines = 2
            label.textColor = ThemeColor.theme_4
            label.textAlignment = .center
            label.font = UIFont.AppFontWith(
                .medium,
                size: 14
            )
            label.translatesAutoresizingMaskIntoConstraints = false

            addSubview(label)

            NSLayoutConstraint.activate([

                label.centerXAnchor.constraint(
                    equalTo: centerXAnchor
                ),

                label.centerYAnchor.constraint(
                    equalTo: centerYAnchor
                ),

                label.widthAnchor.constraint(
                    lessThanOrEqualTo: widthAnchor
                )
            ])
        }

        completion?(
            false,
            nil
        )
    }
}

// MARK: - UIImage Shadow Extension

extension UIImage {

    /// Returns a new image with the specified shadow properties.
    ///
    /// The resulting image includes the original image and the shadow.
    func withShadow(
        blur: CGFloat = 6,
        offset: CGSize = .zero,
        color: UIColor = UIColor(
            white: 0,
            alpha: 0.8
        )
    ) -> UIImage {

        let shadowRect = CGRect(
            x: offset.width - blur,
            y: offset.height - blur,
            width: size.width + blur * 2,
            height: size.height + blur * 2
        )

        let outputSize = CGSize(
            width: max(
                shadowRect.maxX,
                size.width
            ) - min(
                shadowRect.minX,
                0
            ),
            height: max(
                shadowRect.maxY,
                size.height
            ) - min(
                shadowRect.minY,
                0
            )
        )

        UIGraphicsBeginImageContextWithOptions(
            outputSize,
            false,
            0
        )

        guard let context = UIGraphicsGetCurrentContext() else {
            UIGraphicsEndImageContext()
            return self
        }

        context.setShadow(
            offset: offset,
            blur: blur,
            color: color.cgColor
        )

        draw(
            in: CGRect(
                x: max(
                    0,
                    -shadowRect.origin.x
                ),
                y: max(
                    0,
                    -shadowRect.origin.y
                ),
                width: size.width,
                height: size.height
            )
        )

        let image =
            UIGraphicsGetImageFromCurrentImageContext()

        UIGraphicsEndImageContext()

        return image ?? self
    }
}

// MARK: - UIImage Mask / Utility Extension

public extension UIImage {

    func mask(maskImage: UIImage) -> UIImage? {

        guard
            let maskRef = maskImage.cgImage,
            let imageRef = self.cgImage,
            let provider = maskRef.dataProvider
        else {
            return nil
        }

        guard let mask = CGImage(
            maskWidth: maskRef.width,
            height: maskRef.height,
            bitsPerComponent: maskRef.bitsPerComponent,
            bitsPerPixel: maskRef.bitsPerPixel,
            bytesPerRow: maskRef.bytesPerRow,
            provider: provider,
            decode: nil,
            shouldInterpolate: false
        ) else {
            return nil
        }

        guard let maskedImageRef = imageRef.masking(mask) else {
            return nil
        }

        return UIImage(
            cgImage: maskedImageRef
        )
    }

    class func createImageWithColor(
        color: UIColor,
        size: CGSize
    ) -> UIImage {

        let rect = CGRect(
            x: 0,
            y: 0,
            width: size.width,
            height: size.height
        )

        UIGraphicsBeginImageContextWithOptions(
            size,
            false,
            0
        )

        color.setFill()

        UIRectFill(rect)

        let image =
            UIGraphicsGetImageFromCurrentImageContext()

        UIGraphicsEndImageContext()

        return image ?? UIImage()
    }

    func resize(size: CGSize) -> UIImage {

        let scale = UIScreen.main.scale

        let newSize = CGSize(
            width: size.width,
            height: size.height
        )

        UIGraphicsBeginImageContextWithOptions(
            newSize,
            false,
            scale
        )

        guard let context = UIGraphicsGetCurrentContext() else {
            UIGraphicsEndImageContext()
            return self
        }

        context.interpolationQuality = .high

        self.draw(
            in: CGRect(
                origin: .zero,
                size: newSize
            )
        )

        let scaledImage =
            UIGraphicsGetImageFromCurrentImageContext()

        UIGraphicsEndImageContext()

        return scaledImage ?? self
    }

    class func getImage(
        _ url: URL?,
        _ block: @escaping (UIImage) -> Void
    ) {

        guard let url else {
            return
        }

        let resource = KF.ImageResource(
            downloadURL: url
        )

        KingfisherManager.shared.retrieveImage(
            with: resource,
            options: nil,
            progressBlock: nil
        ) { result in

            switch result {

            case .success(let value):

                block(value.image)

            case .failure(let error):

                print(
                    "Error: \(error)"
                )
            }
        }
    }
}

// MARK: - UIImage General Extension

extension UIImage {

    /// Convert image into JPEG format.
    func jpegImage() -> UIImage {

        guard let data = self.jpegData(
            compressionQuality: 1
        ) else {
            return self
        }

        return UIImage(data: data) ?? self
    }

    /// Rotate image by 90 degrees.
    func rotate() -> UIImage {

        switch self.imageOrientation {

        case .up:

            return UIImage(
                cgImage: self.cgImage!,
                scale: self.scale,
                orientation: .right
            )

        case .right:

            return UIImage(
                cgImage: self.cgImage!,
                scale: self.scale,
                orientation: .down
            )

        case .down:

            return UIImage(
                cgImage: self.cgImage!,
                scale: self.scale,
                orientation: .left
            )

        case .left:

            return UIImage(
                cgImage: self.cgImage!,
                scale: self.scale,
                orientation: .up
            )

        default:

            return self
        }
    }
}

// MARK: - UIImageView Rotation

extension UIImageView {

    func rotateImageHalf(
        duration: Double,
        isForward: Bool
    ) {

        let rotation = CABasicAnimation(
            keyPath: "transform.rotation.z"
        )

        rotation.duration = duration
        rotation.isRemovedOnCompletion = false
        rotation.repeatCount = 1
        rotation.fillMode = .forwards
        rotation.fromValue = NSNumber(value: 0.0)

        rotation.toValue = NSNumber(
            value: isForward
                ? Double.pi
                : -Double.pi
        )

        self.layer.add(
            rotation,
            forKey: "rotate"
        )
    }
}
