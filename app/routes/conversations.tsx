import { RiCloseLine, RiSearchLine, RiSettings2Line } from "react-icons/ri";
import { Link } from "react-router";

export default function Convesations() {
	return (
		<div className="h-dvh flex flex-col p-2 max-w-2xl mx-auto">
			<div className="flex items-center gap-4 h-12 p-2">
				<Link to="/" viewTransition>
					<RiCloseLine className="size-6" />
				</Link>
				<div className="flex w-full items-center gap-2 border rounded-full p-2">
					<RiSearchLine className="size-6" />
					<input
						type="text"
						placeholder="搜索"
						className="w-full outline-none"
					/>
				</div>
			</div>
			<main className="flex-1 flex items-center justify-center">
				<span className="font-semibold">正在开发中</span>
			</main>
			<footer className="p-2">
				<div className="flex items-center gap-4 justify-between">
					<div className="flex items-center gap-4">
						<img
							src="https://avatars.githubusercontent.com/u/50396286?v=4"
							alt=""
							className="size-12 rounded-full"
						/>
						<span className="font-semibold">akazwz</span>
					</div>
					<Link to="/settings" viewTransition>
						<RiSettings2Line className="size-6" />
					</Link>
				</div>
			</footer>
		</div>
	);
}
